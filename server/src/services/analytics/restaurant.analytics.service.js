const Donation = require("../../models/Donation");
const Reservation = require("../../models/Reservation");
const Restaurant = require("../../models/Restaurant");
const ApiError = require("../../utils/ApiError");

const { quantityToKg } = require("../../config/impactConstants");
const { clamp01, monthsAgo, daysAgo, countsByKey, fillMonthlyTrend, fillDailyTrend } = require("./shared");

const MONTHS_BACK = 12;
const DAYS_BACK = 7;

const findOwnedRestaurant = async (userId) => {
    const restaurant = await Restaurant.findOne({ user: userId });

    if (!restaurant) {
        throw new ApiError(404, "Restaurant profile not found.");
    }

    return restaurant;
};

const getDashboard = async (userId) => {
    const restaurant = await findOwnedRestaurant(userId);

    const restaurantId = restaurant._id;

    const [
        statusRows,
        reservationRow,
        foodSavedRows,
        topFoodTypeRows,
        monthlyRows,
        weeklyRows,
    ] = await Promise.all([
        Donation.aggregate([
            { $match: { restaurant: restaurantId } },
            { $group: { _id: "$status", count: { $sum: 1 } } },
        ]),

        Reservation.aggregate([
            { $match: { restaurant: restaurantId } },
            {
                $group: {
                    _id: null,
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
                },
            },
        ]),

        Donation.aggregate([
            { $match: { restaurant: restaurantId, status: "completed" } },
            { $group: { _id: "$unit", totalQuantity: { $sum: "$quantity" } } },
        ]),

        Donation.aggregate([
            { $match: { restaurant: restaurantId } },
            { $group: { _id: "$foodType", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 5 },
        ]),

        Donation.aggregate([
            { $match: { restaurant: restaurantId, createdAt: { $gte: monthsAgo(MONTHS_BACK) } } },
            {
                $group: {
                    _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
                    count: { $sum: 1 },
                },
            },
        ]),

        Donation.aggregate([
            { $match: { restaurant: restaurantId, createdAt: { $gte: daysAgo(DAYS_BACK) } } },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    count: { $sum: 1 },
                },
            },
        ]),
    ]);

    const statusCounts = countsByKey(statusRows);

    const totalDonations = statusRows.reduce((sum, row) => sum + row.count, 0);
    const completedDonations = statusCounts.completed || 0;
    const expiredDonations = statusCounts.expired || 0;

    const totalReservations = reservationRow[0]?.total || 0;
    const acceptanceRate = totalReservations
        ? reservationRow[0].followedThrough / totalReservations
        : null;

    const foodSavedKg = foodSavedRows.reduce(
        (sum, row) => sum + quantityToKg(row.totalQuantity, row._id),
        0
    );

    const completionRate = totalDonations ? completedDonations / totalDonations : 0;

    // Impact score: reliability (accepted vs. total reservations) weighted
    // most heavily, then how much of what's posted actually gets completed,
    // then absolute food-saved volume (capped so it doesn't dominate).
    const impactScore = Math.round(
        clamp01(
            (acceptanceRate ?? 0) * 0.4 +
                completionRate * 0.3 +
                clamp01(foodSavedKg / 100) * 0.3
        ) * 100
    );

    return {
        totalDonations,
        completedDonations,
        expiredDonations,

        acceptanceRate: acceptanceRate !== null ? Math.round(acceptanceRate * 100) : null,

        foodSaved: {
            kg: Math.round(foodSavedKg * 10) / 10,
            byUnit: Object.fromEntries(
                foodSavedRows.map((row) => [row._id, row.totalQuantity])
            ),
        },

        topFoodTypes: topFoodTypeRows.map((row) => ({
            foodType: row._id,
            count: row.count,
        })),

        monthlyTrend: fillMonthlyTrend(monthlyRows, MONTHS_BACK),
        weeklyTrend: fillDailyTrend(weeklyRows, DAYS_BACK),

        impactScore,
    };
};

module.exports = { getDashboard };
