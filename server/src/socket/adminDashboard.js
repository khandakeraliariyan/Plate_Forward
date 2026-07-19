const User = require("../models/User");
const Donation = require("../models/Donation");
const Reservation = require("../models/Reservation");

const { roleRoom } = require("./rooms");
const { emitToRoom } = require("./state");
const {
    TOTAL_USERS,
    TOTAL_DONATIONS,
    LIVE_RESERVATIONS,
    LIVE_DELIVERIES,
    ACTIVE_VOLUNTEERS,
    LIVE_ACTIVITY_FEED,
} = require("./events");

const emitAdminStats = async () => {
    const [
        totalUsers,
        totalDonations,
        liveReservations,
        liveDeliveries,
        activeVolunteers,
    ] = await Promise.all([
        User.countDocuments(),
        Donation.countDocuments(),
        Reservation.countDocuments({
            status: { $in: ["reserved", "accepted"] },
        }),
        Reservation.countDocuments({
            status: "picked_up",
        }),
        Reservation.distinct("volunteer", {
            status: { $in: ["picked_up"] },
            volunteer: { $ne: null },
        }).then((ids) => ids.length),
    ]);

    const adminRoom = roleRoom("admin");

    emitToRoom(adminRoom, TOTAL_USERS, { count: totalUsers });
    emitToRoom(adminRoom, TOTAL_DONATIONS, { count: totalDonations });
    emitToRoom(adminRoom, LIVE_RESERVATIONS, { count: liveReservations });
    emitToRoom(adminRoom, LIVE_DELIVERIES, { count: liveDeliveries });
    emitToRoom(adminRoom, ACTIVE_VOLUNTEERS, { count: activeVolunteers });
};

const emitActivityFeed = ({ type, message, data = {} }) => {
    emitToRoom(roleRoom("admin"), LIVE_ACTIVITY_FEED, {
        type,
        message,
        data,
        timestamp: new Date(),
    });
};

module.exports = {
    emitAdminStats,
    emitActivityFeed,
};
