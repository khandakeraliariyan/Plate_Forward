const Donation = require("../models/Donation");
const Reservation = require("../models/Reservation");
const Restaurant = require("../models/Restaurant");

const ApiError = require("../utils/ApiError");

const generatePickupCode = require("../utils/generatePickupCode");
const generateQRCode = require("../utils/generateQRCode");

const mongoose = require("mongoose");

const reserveDonation = async (donationId, ngoId, payload) => {
    const session = await mongoose.startSession();

    try {
        session.startTransaction();

        // Atomically reserve only if still available
        const donation = await Donation.findOneAndUpdate(
            {
                _id: donationId,
                status: "available",
            },
            {
                $set: {
                    status: "reserved",
                },
            },
            {
                new: true,
                session,
            }
        );

        if (!donation) {
            throw new ApiError(
                400,
                "Donation is no longer available."
            );
        }

        const restaurant = await Restaurant.findById(
            donation.restaurant
        ).session(session);

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

        const reservation = await Reservation.create(
            [
                {
                    donation: donation._id,
                    restaurant:
                        restaurant._id,
                    ngo: ngoId,
                    pickupCode,
                    qrCode,
                    expiresAt,
                    notes:
                        payload.notes ||
                        "",
                },
            ],
            { session }
        );

        await session.commitTransaction();

        return reservation[0];
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
};

const cancelReservation = async (reservationId, ngoId, payload) => {
    const session = await mongoose.startSession();

    try {
        session.startTransaction();

        const reservation = await Reservation.findById(
            reservationId
        ).session(session);

        if (!reservation) {
            throw new ApiError(404, "Reservation not found.");
        }

        if (reservation.ngo.toString() !== ngoId.toString()) {
            throw new ApiError(403, "Unauthorized.");
        }

        if (reservation.status !== "reserved") {
            throw new ApiError(400, "Reservation cannot be cancelled.");
        }

        reservation.status = "cancelled";

        reservation.cancelledAt = new Date();

        reservation.cancellationReason = payload.cancellationReason;

        await reservation.save({
            session,
        });

        await Donation.findByIdAndUpdate(
            reservation.donation,
            {
                $set: {
                    status: "available",
                },
            },
            {
                session,
            }
        );

        await session.commitTransaction();

        return reservation;
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
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