const User = require("../models/User");
const Restaurant = require("../models/Restaurant");
const Donation = require("../models/Donation");
const Reservation = require("../models/Reservation");

const ApiError = require("../utils/ApiError");
const storageService = require("./storage.service");
const notificationService = require("./notification.service");
const sessionService = require("./session.service");
const auditLogService = require("./auditLog.service");

const { emitToRoom } = require("../socket");
const { donationRoom, reservationRoom, userRoom } = require("../socket/rooms");
const { DONATION_DELETED, RESERVATION_CANCELLED } = require("../socket/events");
const { emitAdminStats, emitActivityFeed } = require("../socket/adminDashboard");

const paginate = (page, limit, max = 100) => {
    const currentPage = Math.max(parseInt(page, 10) || 1, 1);
    const pageSize = Math.min(Math.max(parseInt(limit, 10) || 20, 1), max);

    return { currentPage, pageSize, skip: (currentPage - 1) * pageSize };
};

// --- User management ---------------------------------------------------

const listUsers = async ({ page, limit, role, isBlocked, search } = {}) => {
    const filter = {};

    if (role) filter.role = role;
    if (isBlocked !== undefined) filter.isBlocked = isBlocked;

    if (search) {
        filter.$or = [
            { fullName: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } },
        ];
    }

    const { currentPage, pageSize, skip } = paginate(page, limit);

    const [users, total] = await Promise.all([
        User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(pageSize),
        User.countDocuments(filter),
    ]);

    return {
        users,
        pagination: {
            total,
            page: currentPage,
            limit: pageSize,
            totalPages: Math.ceil(total / pageSize),
        },
    };
};

const setUserSuspension = async (targetUserId, isBlocked, adminId, reason) => {
    const user = await User.findById(targetUserId);

    if (!user) {
        throw new ApiError(404, "User not found.");
    }

    user.isBlocked = isBlocked;

    await user.save();

    // A suspension should immediately end any of the user's active sessions.
    if (isBlocked) {
        await sessionService.revokeAllSessions(targetUserId);
    }

    await auditLogService.record({
        user: adminId,
        action: isBlocked ? "ADMIN_USER_SUSPENDED" : "ADMIN_USER_UNSUSPENDED",
        metadata: { targetUserId, reason },
    });

    await notificationService.createNotification({
        user: targetUserId,
        title: isBlocked ? "Account Suspended" : "Account Reinstated",
        message: isBlocked
            ? reason || "Your account has been suspended by an administrator."
            : "Your account has been reinstated.",
        type: "SYSTEM",
        priority: "high",
    });

    return user;
};

const deleteUser = async (targetUserId, adminId) => {
    const user = await User.findById(targetUserId);

    if (!user) {
        throw new ApiError(404, "User not found.");
    }

    await sessionService.revokeAllSessions(targetUserId);

    await User.findByIdAndDelete(targetUserId);

    await auditLogService.record({
        user: adminId,
        action: "ADMIN_USER_DELETED",
        metadata: { targetUserId, email: user.email, role: user.role },
    });

    return true;
};

// --- Restaurant verification --------------------------------------------

const verifyRestaurant = async (restaurantId, { isVerified, verificationStatus }, adminId) => {
    const restaurant = await Restaurant.findById(restaurantId).populate("user");

    if (!restaurant) {
        throw new ApiError(404, "Restaurant not found.");
    }

    if (isVerified !== undefined) {
        restaurant.isVerified = isVerified;
    }

    if (verificationStatus) {
        restaurant.verificationStatus = verificationStatus;
    }

    await restaurant.save();

    await auditLogService.record({
        user: adminId,
        action: "ADMIN_RESTAURANT_VERIFIED",
        metadata: { restaurantId, isVerified, verificationStatus },
    });

    if (restaurant.user) {
        await notificationService.createNotification({
            user: restaurant.user._id,
            title: "Verification Update",
            message: `Your restaurant verification status is now "${restaurant.verificationStatus}".`,
            type: "SYSTEM",
            priority: "high",
        });
    }

    return restaurant;
};

// --- Donation moderation -------------------------------------------------

const getAllDonationsAdmin = async ({ page, limit, status, restaurant } = {}) => {
    const filter = {};

    if (status) filter.status = status;
    if (restaurant) filter.restaurant = restaurant;

    const { currentPage, pageSize, skip } = paginate(page, limit);

    const [donations, total] = await Promise.all([
        Donation.find(filter)
            .populate("restaurant", "restaurantName city")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(pageSize),
        Donation.countDocuments(filter),
    ]);

    return {
        donations,
        pagination: {
            total,
            page: currentPage,
            limit: pageSize,
            totalPages: Math.ceil(total / pageSize),
        },
    };
};

const forceDeleteDonation = async (donationId, adminId, reason) => {
    const donation = await Donation.findById(donationId).populate({
        path: "restaurant",
        populate: { path: "user" },
    });

    if (!donation) {
        throw new ApiError(404, "Donation not found.");
    }

    await storageService.deleteFiles(donation.images.map((image) => image.publicId));

    await Donation.findByIdAndDelete(donationId);

    await auditLogService.record({
        user: adminId,
        action: "ADMIN_DONATION_REMOVED",
        metadata: { donationId, reason },
    });

    if (donation.restaurant?.user) {
        await notificationService.createNotification({
            user: donation.restaurant.user._id,
            title: "Donation Removed",
            message:
                reason ||
                "Your donation was removed by an administrator for violating platform guidelines.",
            type: "SYSTEM",
            priority: "high",
        });
    }

    emitToRoom(donationRoom(donationId.toString()), DONATION_DELETED, { donationId });

    await emitAdminStats();

    return true;
};

// --- Reservation moderation ----------------------------------------------

const getAllReservationsAdmin = async ({ page, limit, status } = {}) => {
    const filter = {};

    if (status) filter.status = status;

    const { currentPage, pageSize, skip } = paginate(page, limit);

    const [reservations, total] = await Promise.all([
        Reservation.find(filter)
            .populate("restaurant", "restaurantName")
            .populate("ngo", "fullName email")
            .populate("volunteer", "fullName email")
            .populate("donation", "title foodType quantity unit")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(pageSize),
        Reservation.countDocuments(filter),
    ]);

    return {
        reservations,
        pagination: {
            total,
            page: currentPage,
            limit: pageSize,
            totalPages: Math.ceil(total / pageSize),
        },
    };
};

const NON_CANCELLABLE_STATUSES = ["completed", "cancelled", "expired"];

const forceCancelReservation = async (reservationId, adminId, reason) => {
    const reservation = await Reservation.findById(reservationId);

    if (!reservation) {
        throw new ApiError(404, "Reservation not found.");
    }

    if (NON_CANCELLABLE_STATUSES.includes(reservation.status)) {
        throw new ApiError(
            400,
            `Cannot cancel a reservation that is already ${reservation.status}.`
        );
    }

    reservation.status = "cancelled";
    reservation.cancelledAt = new Date();
    reservation.cancellationReason = reason || "Cancelled by administrator.";

    await reservation.save();

    await Donation.findByIdAndUpdate(reservation.donation, {
        status: "available",
    });

    await auditLogService.record({
        user: adminId,
        action: "ADMIN_RESERVATION_FORCE_CANCELLED",
        metadata: { reservationId, reason },
    });

    await notificationService.createNotification({
        user: reservation.ngo,
        title: "Reservation Cancelled",
        message: reason || "Your reservation was cancelled by an administrator.",
        type: "RESERVATION_CANCELLED",
        priority: "high",
        data: { reservation: reservation._id },
    });

    emitToRoom(reservationRoom(reservation._id.toString()), RESERVATION_CANCELLED, reservation);
    emitToRoom(userRoom(reservation.ngo.toString()), RESERVATION_CANCELLED, reservation);

    await emitAdminStats();

    emitActivityFeed({
        type: RESERVATION_CANCELLED,
        message: "An administrator force-cancelled a reservation.",
        data: { reservationId: reservation._id },
    });

    return reservation;
};

module.exports = {
    listUsers,
    setUserSuspension,
    deleteUser,
    verifyRestaurant,
    getAllDonationsAdmin,
    forceDeleteDonation,
    getAllReservationsAdmin,
    forceCancelReservation,
};
