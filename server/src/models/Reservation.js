const mongoose = require("mongoose");

const reservationSchema = new mongoose.Schema(
    {
        donation: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Donation",
            required: true,
            unique: true,
            index: true,
        },

        restaurant: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Restaurant",
            required: true,
            index: true,
        },

        ngo: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },

        volunteer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },

        status: {
            type: String,
            enum: [
                "reserved",
                "accepted",
                "picked_up",
                "delivered",
                "completed",
                "cancelled",
                "expired",
            ],
            default: "reserved",
            index: true,
        },

        pickupCode: {
            type: String,
            required: true,
            unique: true,
        },

        qrCode: {
            type: String,
            default: "",
        },

        reservedAt: {
            type: Date,
            default: Date.now,
        },

        expiresAt: {
            type: Date,
            required: true,
        },

        acceptedAt: Date,

        pickedUpAt: Date,

        deliveredAt: Date,

        completedAt: Date,

        cancelledAt: Date,

        cancellationReason: {
            type: String,
            default: "",
        },

        notes: {
            type: String,
            default: "",
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model(
    "Reservation",
    reservationSchema
);