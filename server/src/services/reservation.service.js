const Donation = require("../models/Donation");
const Reservation = require("../models/Reservation");
const Restaurant = require("../models/Restaurant");

const ApiError = require("../utils/ApiError");

const generatePickupCode = require("../utils/generatePickupCode");
const generateQRCode = require("../utils/generateQRCode");

const reserveDonation = async (donationId, ngoId, payload) => {
    const donation = await Donation.findById(donationId);

    if (!donation) {
        throw new ApiError(
            404,
            "Donation not found."
        );
    }

    if (donation.status !== "available") {
        throw new ApiError(
            400,
            "Donation is not available."
        );
    }

    const alreadyReserved = await Reservation.findOne({
        donation: donation._id,
        status: {
            $in: [
                "reserved",
                "accepted",
                "picked_up",
            ],
        },
    });

    if (alreadyReserved) {
        throw new ApiError(
            400,
            "Donation already reserved."
        );
    }

    const restaurant = await Restaurant.findById(
        donation.restaurant
    );

    if (!restaurant) {
        throw new ApiError(
            404,
            "Restaurant not found."
        );
    }

    const pickupCode = generatePickupCode();

    const qrCode = await generateQRCode(
        pickupCode
    );

    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    const reservation = await Reservation.create({
        donation: donation._id,

        restaurant:
            restaurant._id,

        ngo: ngoId,

        pickupCode,

        qrCode,

        expiresAt,

        notes:
            payload.notes || "",
    });

    donation.status =
        "reserved";

    await donation.save();

    return reservation;
};

const cancelReservation = async (reservationId, ngoId, payload) => {
    const reservation = await Reservation.findById(
        reservationId
    );

    if (!reservation) {
        throw new ApiError(
            404,
            "Reservation not found."
        );
    }

    if (reservation.ngo.toString() !== ngoId.toString()) {
        throw new ApiError(
            403,
            "Unauthorized."
        );
    }

    if (reservation.status !== "reserved") {
        throw new ApiError(
            400,
            "Reservation cannot be cancelled."
        );
    }

    reservation.status = "cancelled";

    reservation.cancelledAt = new Date();

    reservation.cancellationReason = payload.cancellationReason;

    await reservation.save();

    const donation = await Donation.findById(
        reservation.donation
    );

    donation.status = "available";

    await donation.save();

    return reservation;
};

const getRestaurantReservations = async (restaurantId) => {
    return await Reservation.find({
        restaurant: restaurantId,
    })
        .populate(
            "ngo",
            "fullName email avatar"
        )
        .populate(
            "volunteer",
            "fullName email"
        )
        .populate("donation");
};

const getNGOReservations = async (ngoId) => {
    return await Reservation.find({
        ngo: ngoId,
    })
        .populate(
            "restaurant",
            "restaurantName"
        )
        .populate(
            "donation"
        );
};

module.exports = {
    reserveDonation,

    cancelReservation,

    getRestaurantReservations,

    getNGOReservations,
};