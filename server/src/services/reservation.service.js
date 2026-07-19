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

const getReservationById = async (reservationId, user) => {
    const reservation = await Reservation.findById(reservationId)
        .populate(
            "restaurant",
            "restaurantName ownerName logo phone email address city"
        )
        .populate(
            "ngo",
            "fullName email avatar phone"
        )
        .populate(
            "volunteer",
            "fullName email avatar phone"
        )
        .populate("donation");

    if (!reservation) {
        throw new ApiError(404, "Reservation not found.");
    }

    // Admin can view everything
    if (user.role === "admin") {
        return reservation;
    }

    // NGO that created the reservation
    if (reservation.ngo && reservation.ngo._id.toString() === user._id.toString()) {
        return reservation;
    }

    // Restaurant owner
    if (user.role === "restaurant") {
        const restaurant = await Restaurant.findOne({
            user: user._id,
        });

        if (restaurant && restaurant._id.toString() === reservation.restaurant._id.toString()) {
            return reservation;
        }
    }

    // Assigned volunteer
    if (reservation.volunteer && reservation.volunteer._id.toString() === user._id.toString()) {
        return reservation;
    }

    throw new ApiError(403, "You are not authorized to view this reservation.");
};

const acceptReservation = async (reservationId, restaurantUserId) => {
    const session = await mongoose.startSession();

    try {
        session.startTransaction();

        const restaurant = await Restaurant.findOne({
            user: restaurantUserId,
        }).session(session);

        if (!restaurant) {
            throw new ApiError(404, "Restaurant profile not found.");
        }

        const reservation = await Reservation.findById(
            reservationId
        ).session(session);

        if (!reservation) {
            throw new ApiError(404, "Reservation not found.");
        }

        if (reservation.restaurant.toString() !== restaurant._id.toString()) {
            throw new ApiError(403, "Unauthorized.");
        }

        if (reservation.status !== "reserved") {
            throw new ApiError(400, "Only reserved donations can be accepted.");
        }

        reservation.status = "accepted";

        reservation.acceptedAt = new Date();

        await reservation.save({ session, });

        await session.commitTransaction();

        return await Reservation.findById(
            reservation._id
        )
            .populate(
                "ngo",
                "fullName email avatar"
            )
            .populate(
                "restaurant",
                "restaurantName"
            )
            .populate("donation");
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
};

const pickupReservation = async (reservationId, volunteerId) => {
    const session = await mongoose.startSession();

    try {
        session.startTransaction();

        const reservation = await Reservation.findById(
            reservationId
        ).session(session);

        if (!reservation) {
            throw new ApiError(404, "Reservation not found.");
        }

        if (reservation.status !== "accepted") {
            throw new ApiError(400, "Only accepted reservations can be picked up.");
        }

        // Assign volunteer if none assigned yet
        if (!reservation.volunteer) {
            reservation.volunteer = volunteerId;
        }

        // Prevent another volunteer from completing it
        if (reservation.volunteer.toString() !== volunteerId.toString()) {
            throw new ApiError(403, "This reservation is assigned to another volunteer.");
        }

        reservation.status = "picked_up";
        reservation.pickedUpAt = new Date();

        await reservation.save({
            session,
        });

        await Donation.findByIdAndUpdate(
            reservation.donation,
            {
                $set: {
                    status: "picked_up",
                },
            },
            {
                session,
            }
        );

        await session.commitTransaction();

        return await Reservation.findById(
            reservation._id
        )
            .populate(
                "ngo",
                "fullName email avatar"
            )
            .populate(
                "restaurant",
                "restaurantName"
            )
            .populate(
                "volunteer",
                "fullName email avatar"
            )
            .populate("donation");
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
};

const deliverReservation = async (reservationId, volunteerId) => {
    const session = await mongoose.startSession();

    try {
        session.startTransaction();

        const reservation = await Reservation.findById(
            reservationId
        ).session(session);

        if (!reservation) {
            throw new ApiError(404, "Reservation not found.");
        }

        if (reservation.status !== "picked_up") {
            throw new ApiError(400, "Only picked up reservations can be delivered.");
        }

        if (!reservation.volunteer || reservation.volunteer.toString() !== volunteerId.toString()) {
            throw new ApiError(403, "You are not assigned to this reservation.");
        }

        reservation.status = "delivered";

        reservation.deliveredAt = new Date();

        await reservation.save({ session });

        await Donation.findByIdAndUpdate(
            reservation.donation,
            {
                $set: {
                    status: "delivered",
                },
            },
            {
                session,
            }
        );

        await session.commitTransaction();

        return await Reservation.findById(
            reservation._id
        )
            .populate(
                "ngo",
                "fullName email avatar"
            )
            .populate(
                "restaurant",
                "restaurantName"
            )
            .populate(
                "volunteer",
                "fullName email avatar"
            )
            .populate("donation");
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
};

const completeReservation = async (reservationId, userId) => {
    const session = await mongoose.startSession();

    try {
        session.startTransaction();

        const reservation = await Reservation.findById(
            reservationId
        ).session(session);

        if (!reservation) {
            throw new ApiError(404, "Reservation not found.");
        }

        // Only delivered reservations can be completed
        if (reservation.status !== "delivered") {
            throw new ApiError(400, "Only delivered reservations can be completed.");
        }

        // Restaurant owner or Admin can complete
        let authorized = false;

        if (userId.role === "admin") {
            authorized = true;
        } else if (
            userId.role === "restaurant"
        ) {
            const restaurant = await Restaurant.findOne({
                user: userId._id,
            }).session(session);

            if (restaurant && restaurant._id.toString() === reservation.restaurant.toString()
            ) {
                authorized = true;
            }
        }

        if (!authorized) {
            throw new ApiError(403, "Unauthorized.");
        }

        reservation.status = "completed";

        reservation.completedAt = new Date();

        await reservation.save({ session });

        await Donation.findByIdAndUpdate(
            reservation.donation,
            {
                $set: {
                    status:
                        "completed",
                },
            },
            {
                session,
            }
        );

        await session.commitTransaction();

        return await Reservation.findById(
            reservation._id
        )
            .populate(
                "restaurant",
                "restaurantName ownerName"
            )
            .populate(
                "ngo",
                "fullName email avatar"
            )
            .populate(
                "volunteer",
                "fullName email avatar"
            )
            .populate("donation");
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
};

module.exports = {
    reserveDonation,

    cancelReservation,

    getRestaurantReservations,

    getNGOReservations,

    getReservationById,

    acceptReservation,

    pickupReservation,

    deliverReservation,

    completeReservation
};