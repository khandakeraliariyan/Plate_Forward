const catchAsync = require("../utils/catchAsync");

const { reserveDonationSchema, cancelReservationSchema, } = require("../validations/reservation.validation");

const reservationService = require("../services/reservation.service");

exports.reserveDonation = catchAsync(async (req, res) => {
    const payload = reserveDonationSchema.parse(req.body);

    const reservation = await reservationService.reserveDonation(
        req.params.donationId,
        req.user._id,
        payload
    );

    res.status(201).json({
        success: true,
        message:
            "Donation reserved successfully.",
        data: reservation,
    });
}
);

exports.cancelReservation = catchAsync(async (req, res) => {
    const payload = cancelReservationSchema.parse(req.body);

    const reservation = await reservationService.cancelReservation(
        req.params.reservationId,
        req.user._id,
        payload
    );

    res.status(200).json({
        success: true,
        message:
            "Reservation cancelled successfully.",
        data: reservation,
    });
}
);

exports.getRestaurantReservations = catchAsync(async (req, res) => {
    const reservations = await reservationService.getRestaurantReservations(
        req.user._id
    );

    res.status(200).json({
        success: true,
        count: reservations.length,
        data: reservations,
    });
});


exports.getNGOReservations = catchAsync(async (req, res) => {
    const reservations = await reservationService.getNGOReservations(
        req.user._id
    );

    res.status(200).json({
        success: true,
        count: reservations.length,
        data: reservations,
    });
});

exports.getReservationById = catchAsync(async (req, res) => {
    const reservation = await reservationService.getReservationById(
        req.params.reservationId,
        req.user
    );

    res.status(200).json({
        success: true,
        data: reservation,
    });
});

exports.acceptReservation = catchAsync(async (req, res) => {
    const reservation = await reservationService.acceptReservation(
        req.params.reservationId,
        req.user._id
    );

    res.status(200).json({
        success: true,
        message:
            "Reservation accepted.",
        data: reservation,
    });
});

exports.pickupReservation = catchAsync(async (req, res) => {
    const reservation = await reservationService.pickupReservation(
        req.params.reservationId,
        req.user._id
    );

    res.status(200).json({
        success: true,
        message:
            "Donation picked up.",
        data: reservation,
    });
});

exports.deliverReservation = catchAsync(async (req, res) => {
    const reservation = await reservationService.deliverReservation(
        req.params.reservationId,
        req.user._id
    );

    res.status(200).json({
        success: true,
        message:
            "Donation delivered.",
        data: reservation,
    });
});

exports.completeReservation = catchAsync(async (req, res) => {
    const reservation = await reservationService.completeReservation(
        req.params.reservationId,
        req.user._id
    );

    res.status(200).json({
        success: true,
        message:
            "Reservation completed.",
        data: reservation,
    });
});