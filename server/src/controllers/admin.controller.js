const catchAsync = require("../utils/catchAsync");

const adminService = require("../services/admin.service");

const {
    listUsersQuerySchema,
    suspendUserSchema,
    verifyRestaurantSchema,
    adminDonationsQuerySchema,
    forceDeleteDonationSchema,
    adminReservationsQuerySchema,
    forceCancelReservationSchema,
} = require("../validations/admin.validation");

exports.listUsers = catchAsync(async (req, res) => {
    const query = listUsersQuerySchema.parse(req.query);

    const result = await adminService.listUsers(query);

    res.json({
        success: true,
        pagination: result.pagination,
        data: result.users,
    });
});

exports.setUserSuspension = catchAsync(async (req, res) => {
    const payload = suspendUserSchema.parse(req.body);

    const user = await adminService.setUserSuspension(
        req.params.userId,
        payload.isBlocked,
        req.user._id,
        payload.reason
    );

    res.json({
        success: true,
        message: payload.isBlocked ? "User suspended." : "User reinstated.",
        data: user,
    });
});

exports.deleteUser = catchAsync(async (req, res) => {
    await adminService.deleteUser(req.params.userId, req.user._id);

    res.json({
        success: true,
        message: "User deleted successfully.",
    });
});

exports.verifyRestaurant = catchAsync(async (req, res) => {
    const payload = verifyRestaurantSchema.parse(req.body);

    const restaurant = await adminService.verifyRestaurant(
        req.params.restaurantId,
        payload,
        req.user._id
    );

    res.json({
        success: true,
        message: "Restaurant verification updated.",
        data: restaurant,
    });
});

exports.getAllDonations = catchAsync(async (req, res) => {
    const query = adminDonationsQuerySchema.parse(req.query);

    const result = await adminService.getAllDonationsAdmin(query);

    res.json({
        success: true,
        pagination: result.pagination,
        data: result.donations,
    });
});

exports.forceDeleteDonation = catchAsync(async (req, res) => {
    const payload = forceDeleteDonationSchema.parse(req.body);

    await adminService.forceDeleteDonation(
        req.params.donationId,
        req.user._id,
        payload.reason
    );

    res.json({
        success: true,
        message: "Donation removed successfully.",
    });
});

exports.getAllReservations = catchAsync(async (req, res) => {
    const query = adminReservationsQuerySchema.parse(req.query);

    const result = await adminService.getAllReservationsAdmin(query);

    res.json({
        success: true,
        pagination: result.pagination,
        data: result.reservations,
    });
});

exports.forceCancelReservation = catchAsync(async (req, res) => {
    const payload = forceCancelReservationSchema.parse(req.body);

    const reservation = await adminService.forceCancelReservation(
        req.params.reservationId,
        req.user._id,
        payload.reason
    );

    res.json({
        success: true,
        message: "Reservation cancelled successfully.",
        data: reservation,
    });
});
