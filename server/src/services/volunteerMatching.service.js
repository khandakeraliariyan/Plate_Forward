const Reservation = require("../models/Reservation");
const User = require("../models/User");
const ApiError = require("../utils/ApiError");
const { haversineKm } = require("../utils/geo");

// Same dynamic-renormalization approach as the NGO recommendation engine
// (Module 14): factors without enough data are dropped and the remaining
// weights are rescaled to sum back to 1.
const WEIGHTS = {
    distance: 0.35,
    reliability: 0.25,
    rating: 0.2,
    workload: 0.2,
};

const DISTANCE_SCORE_FLOOR_KM = 30;
const MAX_ACTIVE_ASSIGNMENTS = 3;

const clamp01 = (value) => Math.min(1, Math.max(0, value));

const combineScores = (factorScores) => {
    let weightedSum = 0;
    let totalWeight = 0;

    for (const [factor, score] of Object.entries(factorScores)) {
        if (score === null) continue;

        weightedSum += score * WEIGHTS[factor];
        totalWeight += WEIGHTS[factor];
    }

    return totalWeight === 0 ? 0 : weightedSum / totalWeight;
};

const computeVolunteerStats = async (volunteerIds) => {
    const rows = await Reservation.aggregate([
        { $match: { volunteer: { $in: volunteerIds } } },
        {
            $group: {
                _id: "$volunteer",
                total: { $sum: 1 },
                delivered: {
                    $sum: {
                        $cond: [{ $in: ["$status", ["delivered", "completed"]] }, 1, 0],
                    },
                },
                active: {
                    $sum: {
                        $cond: [{ $in: ["$status", ["accepted", "picked_up"]] }, 1, 0],
                    },
                },
                ratingSum: {
                    $sum: { $ifNull: ["$rating.score", 0] },
                },
                ratingCount: {
                    $sum: { $cond: [{ $ifNull: ["$rating.score", false] }, 1, 0] },
                },
            },
        },
    ]);

    const stats = new Map();

    for (const row of rows) {
        stats.set(row._id.toString(), {
            completionRate: row.total ? row.delivered / row.total : null,
            activeAssignments: row.active,
            avgRating: row.ratingCount ? row.ratingSum / row.ratingCount : null,
        });
    }

    return stats;
};

const getSuggestedVolunteers = async (reservationId, limit = 10) => {
    const reservation = await Reservation.findById(reservationId).populate(
        "donation",
        "latitude longitude pickupAddress"
    );

    if (!reservation) {
        throw new ApiError(404, "Reservation not found.");
    }

    if (reservation.status !== "accepted") {
        throw new ApiError(
            400,
            "Only accepted reservations need a volunteer suggestion."
        );
    }

    const volunteers = await User.find({ role: "volunteer", isBlocked: false });

    if (!volunteers.length) {
        return [];
    }

    const stats = await computeVolunteerStats(volunteers.map((v) => v._id));

    const donationLat = reservation.donation?.latitude;
    const donationLng = reservation.donation?.longitude;

    const scored = volunteers.map((volunteer) => {
        const volunteerStats = stats.get(volunteer._id.toString());

        let distanceKm = null;
        let distanceScore = null;

        const vLat = volunteer.volunteerProfile?.latitude;
        const vLng = volunteer.volunteerProfile?.longitude;

        if (donationLat != null && donationLng != null && vLat != null && vLng != null) {
            distanceKm = haversineKm(donationLat, donationLng, vLat, vLng);

            const maxDistance =
                volunteer.volunteerProfile.maxDistanceKm || DISTANCE_SCORE_FLOOR_KM;

            distanceScore =
                distanceKm > maxDistance ? 0 : clamp01(1 - distanceKm / maxDistance);
        }

        const factorScores = {
            distance: distanceScore,
            reliability: volunteerStats?.completionRate ?? null,
            rating: volunteerStats?.avgRating != null ? clamp01(volunteerStats.avgRating / 5) : null,
            workload:
                volunteerStats?.activeAssignments != null
                    ? clamp01(1 - volunteerStats.activeAssignments / MAX_ACTIVE_ASSIGNMENTS)
                    : 1,
        };

        return {
            volunteerId: volunteer._id,
            fullName: volunteer.fullName,
            email: volunteer.email,
            phone: volunteer.phone,
            distanceKm: distanceKm !== null ? Math.round(distanceKm * 10) / 10 : null,
            activeAssignments: volunteerStats?.activeAssignments ?? 0,
            matchScore: Math.round(combineScores(factorScores) * 100),
            factors: factorScores,
        };
    });

    scored.sort((a, b) => b.matchScore - a.matchScore);

    return scored.slice(0, limit);
};

module.exports = { getSuggestedVolunteers };
