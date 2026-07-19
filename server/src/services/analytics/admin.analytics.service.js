const mongoose = require("mongoose");

const User = require("../../models/User");
const Donation = require("../../models/Donation");
const Reservation = require("../../models/Reservation");

const { quantityToKg, KG_PER_MEAL, CO2_KG_PER_FOOD_KG } = require("../../config/impactConstants");
const { daysAgo, monthsAgo, fillMonthlyTrend } = require("./shared");
const { getIO } = require("../../socket");

const MONTHS_BACK = 12;
const ACTIVE_WINDOW_DAYS = 30;

const getDashboard = async () => {
    const [
        totalUsers,
        totalRestaurants,
        totalNgos,
        totalVolunteers,
        newUsersLast30,
        newUsersPrev30,
        activeUsers,
        userGrowthRows,
        foodSavedRows,
        mealsServedCount,
        totalDonations,
        totalReservations,
    ] = await Promise.all([
        User.countDocuments(),

        User.countDocuments({ role: "restaurant" }),

        User.countDocuments({ role: "ngo" }),

        User.countDocuments({ role: "volunteer" }),

        User.countDocuments({ createdAt: { $gte: daysAgo(ACTIVE_WINDOW_DAYS) } }),

        User.countDocuments({
            createdAt: {
                $gte: daysAgo(ACTIVE_WINDOW_DAYS * 2),
                $lt: daysAgo(ACTIVE_WINDOW_DAYS),
            },
        }),

        User.countDocuments({ lastLogin: { $gte: daysAgo(ACTIVE_WINDOW_DAYS) } }),

        User.aggregate([
            { $match: { createdAt: { $gte: monthsAgo(MONTHS_BACK) } } },
            {
                $group: {
                    _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
                    count: { $sum: 1 },
                },
            },
        ]),

        Donation.aggregate([
            { $match: { status: "completed" } },
            { $group: { _id: "$unit", totalQuantity: { $sum: "$quantity" } } },
        ]),

        Reservation.countDocuments({ status: "completed" }),

        Donation.countDocuments(),

        Reservation.countDocuments(),
    ]);

    const foodSavedKg = foodSavedRows.reduce(
        (sum, row) => sum + quantityToKg(row.totalQuantity, row._id),
        0
    );

    const growthRate = newUsersPrev30
        ? Math.round(((newUsersLast30 - newUsersPrev30) / newUsersPrev30) * 1000) / 10
        : null;

    return {
        platformGrowth: {
            totalUsers,
            totalRestaurants,
            totalNgos,
            totalVolunteers,
            newUsersLast30Days: newUsersLast30,
            growthRatePercent: growthRate,
            monthlyNewUsers: fillMonthlyTrend(userGrowthRows, MONTHS_BACK),
        },

        newUsers: newUsersLast30,

        totalDonations,

        totalReservations,

        foodSavedKg: Math.round(foodSavedKg * 10) / 10,

        co2ReducedKg: Math.round(foodSavedKg * CO2_KG_PER_FOOD_KG * 10) / 10,

        mealsServed: Math.max(mealsServedCount, Math.round(foodSavedKg / KG_PER_MEAL)),

        activeUsers,

        systemHealth: getSystemHealth(),
    };
};

const getSystemHealth = () => {
    const dbStates = ["disconnected", "connected", "connecting", "disconnecting"];

    let connectedSockets = null;

    try {
        connectedSockets = getIO().engine.clientsCount;
    } catch {
        connectedSockets = null;
    }

    return {
        database: dbStates[mongoose.connection.readyState] || "unknown",
        uptimeSeconds: Math.round(process.uptime()),
        memory: {
            rssMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
            heapUsedMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        },
        connectedSockets,
    };
};

// Donation pickup locations for an admin map/heatmap layer. Each point is
// weighted by quantity so larger donations render "hotter".
const getDonationHeatmap = async () => {
    const points = await Donation.aggregate([
        {
            $match: {
                latitude: { $ne: null },
                longitude: { $ne: null },
                status: { $in: ["available", "reserved", "picked_up"] },
            },
        },
        {
            $project: {
                _id: 0,
                lat: "$latitude",
                lng: "$longitude",
                weight: "$quantity",
                city: 1,
                foodType: 1,
            },
        },
    ]);

    return points;
};

module.exports = { getDashboard, getDonationHeatmap };
