const Reservation = require("../../models/Reservation");

const { quantityToKg, KG_PER_MEAL } = require("../../config/impactConstants");
const { countsByKey } = require("./shared");

const HISTORY_LIMIT = 10;
const FAVORITE_RESTAURANTS_LIMIT = 5;

const getDashboard = async (ngoId) => {
    const [statusRows, mealsRow, history, favoriteRestaurants] = await Promise.all([
        Reservation.aggregate([
            { $match: { ngo: ngoId } },
            { $group: { _id: "$status", count: { $sum: 1 } } },
        ]),

        Reservation.aggregate([
            { $match: { ngo: ngoId, status: "completed" } },
            {
                $lookup: {
                    from: "donations",
                    localField: "donation",
                    foreignField: "_id",
                    as: "donation",
                },
            },
            { $unwind: "$donation" },
            {
                $group: {
                    _id: "$donation.unit",
                    totalQuantity: { $sum: "$donation.quantity" },
                },
            },
        ]),

        Reservation.find({ ngo: ngoId })
            .populate("restaurant", "restaurantName city logo")
            .populate("donation", "title foodType quantity unit")
            .sort({ createdAt: -1 })
            .limit(HISTORY_LIMIT),

        Reservation.aggregate([
            { $match: { ngo: ngoId, status: "completed" } },
            { $group: { _id: "$restaurant", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: FAVORITE_RESTAURANTS_LIMIT },
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
                    city: "$restaurant.city",
                    logo: "$restaurant.logo",
                    completedReservations: "$count",
                },
            },
        ]),
    ]);

    const statusCounts = countsByKey(statusRows);

    const totalReservations = statusRows.reduce((sum, row) => sum + row.count, 0);

    const mealsKg = mealsRow.reduce(
        (sum, row) => sum + quantityToKg(row.totalQuantity, row._id),
        0
    );

    return {
        reservations: totalReservations,
        completed: statusCounts.completed || 0,
        cancelled: statusCounts.cancelled || 0,
        expired: statusCounts.expired || 0,

        mealsReceived: {
            estimatedMeals: Math.round(mealsKg / KG_PER_MEAL),
            estimatedKg: Math.round(mealsKg * 10) / 10,
        },

        history,
        favoriteRestaurants,
    };
};

module.exports = { getDashboard };
