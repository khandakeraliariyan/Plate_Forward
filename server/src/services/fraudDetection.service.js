const Donation = require("../models/Donation");
const Reservation = require("../models/Reservation");

// Heuristic, non-blocking fraud signals (Module 16) - flagged donations are
// still created normally; flags just surface for admin review rather than
// rejecting the post outright, to avoid false-positive lockouts.
const DUPLICATE_WINDOW_HOURS = 6;

const SPAM_PATTERNS = [
    /https?:\/\//i,
    /www\./i,
    /\b(?:buy now|click here|free money|earn \$|whatsapp|telegram|投资|casino)\b/i,
];

const detectDuplicateDonation = async (restaurantId, payload) => {
    const since = new Date(Date.now() - DUPLICATE_WINDOW_HOURS * 3_600_000);

    const existing = await Donation.findOne({
        restaurant: restaurantId,
        title: payload.title,
        foodType: payload.foodType,
        quantity: payload.quantity,
        status: { $in: ["available", "reserved", "picked_up"] },
        createdAt: { $gte: since },
    });

    if (!existing) {
        return null;
    }

    return {
        type: "duplicate",
        reason: `Matches an existing active donation ("${existing.title}") posted within the last ${DUPLICATE_WINDOW_HOURS} hours.`,
        relatedDonation: existing._id,
    };
};

const detectSpamContent = (payload) => {
    const text = `${payload.title} ${payload.description || ""}`;

    for (const pattern of SPAM_PATTERNS) {
        if (pattern.test(text)) {
            return {
                type: "spam",
                reason: "Donation text matches known spam/promotional patterns.",
                relatedDonation: null,
            };
        }
    }

    const letters = text.replace(/[^a-zA-Z]/g, "");

    if (letters.length >= 10) {
        const upperRatio = (text.match(/[A-Z]/g) || []).length / letters.length;

        if (upperRatio > 0.7) {
            return {
                type: "spam",
                reason: "Excessive use of uppercase letters.",
                relatedDonation: null,
            };
        }
    }

    return null;
};

const evaluateNewDonation = async (restaurantId, payload) => {
    const flags = [];

    const duplicate = await detectDuplicateDonation(restaurantId, payload);
    if (duplicate) flags.push(duplicate);

    const spam = detectSpamContent(payload);
    if (spam) flags.push(spam);

    return flags;
};

const MIN_SAMPLE_SIZE = 3;
const HIGH_CANCELLATION_THRESHOLD = 0.5;
const HIGH_EXPIRY_THRESHOLD = 0.6;

// NGOs that cancel an unusually high share of their reservations.
const getSuspiciousNgos = async () => {
    return Reservation.aggregate([
        {
            $group: {
                _id: "$ngo",
                total: { $sum: 1 },
                cancelled: { $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] } },
            },
        },
        { $match: { total: { $gte: MIN_SAMPLE_SIZE } } },
        {
            $project: {
                total: 1,
                cancelled: 1,
                cancellationRate: { $divide: ["$cancelled", "$total"] },
            },
        },
        { $match: { cancellationRate: { $gte: HIGH_CANCELLATION_THRESHOLD } } },
        {
            $lookup: {
                from: "users",
                localField: "_id",
                foreignField: "_id",
                as: "user",
            },
        },
        { $unwind: "$user" },
        {
            $project: {
                _id: 0,
                userId: "$user._id",
                fullName: "$user.fullName",
                email: "$user.email",
                total: 1,
                cancelled: 1,
                cancellationRate: { $round: [{ $multiply: ["$cancellationRate", 100] }, 0] },
            },
        },
        { $sort: { cancellationRate: -1 } },
    ]);
};

// Restaurants whose donations expire unclaimed unusually often - could
// indicate spam listings or a restaurant that never intends to follow through.
const getSuspiciousRestaurants = async () => {
    return Donation.aggregate([
        {
            $group: {
                _id: "$restaurant",
                total: { $sum: 1 },
                expired: { $sum: { $cond: [{ $eq: ["$status", "expired"] }, 1, 0] } },
            },
        },
        { $match: { total: { $gte: MIN_SAMPLE_SIZE } } },
        {
            $project: {
                total: 1,
                expired: 1,
                expiryRate: { $divide: ["$expired", "$total"] },
            },
        },
        { $match: { expiryRate: { $gte: HIGH_EXPIRY_THRESHOLD } } },
        {
            $lookup: {
                from: "restaurants",
                localField: "_id",
                foreignField: "_id",
                as: "restaurant",
            },
        },
        { $unwind: "$restaurant" },
        {
            $project: {
                _id: 0,
                restaurantId: "$restaurant._id",
                restaurantName: "$restaurant.restaurantName",
                total: 1,
                expired: 1,
                expiryRate: { $round: [{ $multiply: ["$expiryRate", 100] }, 0] },
            },
        },
        { $sort: { expiryRate: -1 } },
    ]);
};

const getFlaggedDonations = async () => {
    return Donation.find({ "fraudFlags.0": { $exists: true } })
        .select("title foodType quantity status fraudFlags createdAt")
        .populate("restaurant", "restaurantName")
        .sort({ createdAt: -1 })
        .limit(50);
};

const getFraudReport = async () => {
    const [suspiciousNgos, suspiciousRestaurants, flaggedDonations] = await Promise.all([
        getSuspiciousNgos(),
        getSuspiciousRestaurants(),
        getFlaggedDonations(),
    ]);

    return { suspiciousNgos, suspiciousRestaurants, flaggedDonations };
};

module.exports = {
    evaluateNewDonation,
    getFraudReport,
};
