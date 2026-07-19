const mongoose = require("mongoose");

const Donation = require("../models/Donation");
const Reservation = require("../models/Reservation");
const User = require("../models/User");
const ApiError = require("../utils/ApiError");

// Weight of each scoring factor when all of them are computable for a given
// donation. Factors that can't be computed (e.g. no NGO location, no
// reservation history yet) are dropped and the remaining weights are
// renormalized to sum back to 1 for that donation - see combineScores().
const WEIGHTS = {
    distance: 0.2,
    foodTypePreference: 0.15,
    quantityFit: 0.1,
    expiryUrgency: 0.15,
    historyAffinity: 0.15,
    restaurantAcceptanceRate: 0.15,
    restaurantDeliverySpeed: 0.1,
};

// How many "not yet expired, available" donations to pull and score before
// paginating. Keeps the in-memory scoring pass bounded on large datasets.
const CANDIDATE_POOL_SIZE = 300;

// Distance beyond which the distance factor bottoms out at 0.
const DISTANCE_SCORE_FLOOR_KM = 50;

// Reservations expiring further out than this get the minimum urgency score.
const URGENCY_WINDOW_HOURS = 48;

// Deliveries slower than this get the minimum delivery-speed score.
const DELIVERY_SPEED_FLOOR_HOURS = 6;

const toRad = (deg) => (deg * Math.PI) / 180;

const haversineKm = (lat1, lon1, lat2, lon2) => {
    const R = 6371;

    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

    return R * 2 * Math.asin(Math.sqrt(a));
};

const clamp01 = (value) => Math.min(1, Math.max(0, value));

// Combines whichever per-donation factor scores are present (0-1 each),
// dropping any factor that returned null (not computable) and renormalizing
// the remaining weights so they still sum to 1.
const combineScores = (factorScores) => {
    let weightedSum = 0;
    let totalWeight = 0;

    for (const [factor, score] of Object.entries(factorScores)) {
        if (score === null) {
            continue;
        }

        weightedSum += score * WEIGHTS[factor];
        totalWeight += WEIGHTS[factor];
    }

    if (totalWeight === 0) {
        return 0;
    }

    return weightedSum / totalWeight;
};

const scoreDistance = (ngo, donation) => {
    if (
        ngo.ngoPreferences?.latitude === undefined ||
        ngo.ngoPreferences?.longitude === undefined ||
        donation.latitude === undefined ||
        donation.longitude === undefined ||
        donation.latitude === null ||
        donation.longitude === null
    ) {
        return { score: null, distanceKm: null };
    }

    const distanceKm = haversineKm(
        ngo.ngoPreferences.latitude,
        ngo.ngoPreferences.longitude,
        donation.latitude,
        donation.longitude
    );

    const maxDistance = ngo.ngoPreferences.maxDistanceKm || DISTANCE_SCORE_FLOOR_KM;

    if (distanceKm > maxDistance) {
        return { score: 0, distanceKm };
    }

    return { score: clamp01(1 - distanceKm / maxDistance), distanceKm };
};

const scoreFoodTypePreference = (ngo, donation) => {
    const preferred = ngo.ngoPreferences?.preferredFoodTypes;

    if (!preferred || !preferred.length) {
        return null;
    }

    return preferred.includes(donation.foodType) ? 1 : 0.2;
};

const scoreQuantityFit = (ngo, donation) => {
    const minQuantity = ngo.ngoPreferences?.minQuantity;

    if (minQuantity === undefined || minQuantity === null) {
        return null;
    }

    if (minQuantity === 0) {
        return 1;
    }

    return clamp01(donation.quantity / minQuantity);
};

const scoreExpiryUrgency = (donation) => {
    const hoursRemaining = (donation.expiryTime.getTime() - Date.now()) / 3_600_000;

    if (hoursRemaining <= 0) {
        return 0;
    }

    return clamp01(1 - hoursRemaining / URGENCY_WINDOW_HOURS);
};

// Restaurant-level reliability, computed once per recommendation request
// over every candidate restaurant's full reservation history.
const computeRestaurantStats = async (restaurantIds) => {
    const rows = await Reservation.aggregate([
        {
            $match: {
                restaurant: { $in: restaurantIds },
            },
        },
        {
            $group: {
                _id: "$restaurant",
                total: { $sum: 1 },
                followedThrough: {
                    $sum: {
                        $cond: [
                            {
                                $in: [
                                    "$status",
                                    ["accepted", "picked_up", "delivered", "completed"],
                                ],
                            },
                            1,
                            0,
                        ],
                    },
                },
                deliveryHoursSum: {
                    $sum: {
                        $cond: [
                            {
                                $and: [
                                    { $ne: ["$acceptedAt", null] },
                                    { $ne: ["$deliveredAt", null] },
                                ],
                            },
                            {
                                $divide: [
                                    { $subtract: ["$deliveredAt", "$acceptedAt"] },
                                    3_600_000,
                                ],
                            },
                            0,
                        ],
                    },
                },
                deliveryCount: {
                    $sum: {
                        $cond: [
                            {
                                $and: [
                                    { $ne: ["$acceptedAt", null] },
                                    { $ne: ["$deliveredAt", null] },
                                ],
                            },
                            1,
                            0,
                        ],
                    },
                },
            },
        },
    ]);

    const stats = new Map();

    for (const row of rows) {
        stats.set(row._id.toString(), {
            acceptanceRate: row.total ? row.followedThrough / row.total : null,
            avgDeliveryHours: row.deliveryCount
                ? row.deliveryHoursSum / row.deliveryCount
                : null,
        });
    }

    return stats;
};

// The NGO's own history: how often it has completed (vs. cancelled) past
// reservations with a given restaurant, used as an affinity signal.
const computeNgoHistory = async (ngoId) => {
    const rows = await Reservation.aggregate([
        {
            $match: { ngo: ngoId },
        },
        {
            $group: {
                _id: "$restaurant",
                total: { $sum: 1 },
                completed: {
                    $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
                },
            },
        },
    ]);

    const history = new Map();

    for (const row of rows) {
        history.set(row._id.toString(), {
            completionRate: row.total ? row.completed / row.total : null,
        });
    }

    return history;
};

const getRecommendations = async (ngoId, { page = 1, limit = 10 } = {}) => {
    const ngo = await User.findById(ngoId);

    if (!ngo) {
        throw new ApiError(404, "User not found.");
    }

    const candidates = await Donation.find({
        status: "available",
        expiryTime: { $gt: new Date() },
    })
        .populate({
            path: "restaurant",
            select: "restaurantName city logo address isVerified",
        })
        .sort({ createdAt: -1 })
        .limit(CANDIDATE_POOL_SIZE);

    if (!candidates.length) {
        return emptyResult(page, limit);
    }

    const restaurantIds = [
        ...new Set(candidates.map((donation) => donation.restaurant._id.toString())),
    ].map((id) => new mongoose.Types.ObjectId(id));

    const [restaurantStats, ngoHistory] = await Promise.all([
        computeRestaurantStats(restaurantIds),
        computeNgoHistory(ngo._id),
    ]);

    const scored = candidates.map((donation) => {
        const restaurantId = donation.restaurant._id.toString();

        const { score: distanceScore, distanceKm } = scoreDistance(ngo, donation);

        const stats = restaurantStats.get(restaurantId);
        const history = ngoHistory.get(restaurantId);

        const factorScores = {
            distance: distanceScore,
            foodTypePreference: scoreFoodTypePreference(ngo, donation),
            quantityFit: scoreQuantityFit(ngo, donation),
            expiryUrgency: scoreExpiryUrgency(donation),
            historyAffinity: history?.completionRate ?? null,
            restaurantAcceptanceRate: stats?.acceptanceRate ?? null,
            restaurantDeliverySpeed:
                stats?.avgDeliveryHours != null
                    ? clamp01(1 - stats.avgDeliveryHours / DELIVERY_SPEED_FLOOR_HOURS)
                    : null,
        };

        return {
            donation,
            distanceKm,
            score: combineScores(factorScores),
            factorScores,
        };
    });

    scored.sort((a, b) => b.score - a.score);

    const currentPage = Math.max(parseInt(page, 10) || 1, 1);
    const pageSize = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 50);
    const skip = (currentPage - 1) * pageSize;

    const pageItems = scored.slice(skip, skip + pageSize);

    const totalPages = Math.ceil(scored.length / pageSize);

    return {
        recommendations: pageItems.map(({ donation, distanceKm, score, factorScores }) => ({
            donation,
            distanceKm: distanceKm !== null ? Math.round(distanceKm * 10) / 10 : null,
            matchScore: Math.round(score * 100),
            factors: factorScores,
        })),

        pagination: {
            total: scored.length,
            page: currentPage,
            limit: pageSize,
            totalPages,
            hasNextPage: currentPage < totalPages,
            hasPrevPage: currentPage > 1,
        },
    };
};

const emptyResult = (page, limit) => ({
    recommendations: [],
    pagination: {
        total: 0,
        page: Math.max(parseInt(page, 10) || 1, 1),
        limit: Math.min(Math.max(parseInt(limit, 10) || 10, 1), 50),
        totalPages: 0,
        hasNextPage: false,
        hasPrevPage: false,
    },
});

module.exports = {
    getRecommendations,
};
