const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },

        title: {
            type: String,
            required: true,
            trim: true,
            maxlength: 150,
        },

        message: {
            type: String,
            required: true,
            trim: true,
            maxlength: 1000,
        },

        type: {
            type: String,
            enum: [
                "DONATION_CREATED",
                "DONATION_RESERVED",
                "DONATION_CANCELLED",
                "DONATION_EXPIRED",

                "RESERVATION_ACCEPTED",
                "RESERVATION_CANCELLED",
                "RESERVATION_COMPLETED",
                "RESERVATION_EXPIRED",

                "VOLUNTEER_ASSIGNED",
                "FOOD_PICKED_UP",
                "FOOD_DELIVERED",

                "SYSTEM",
            ],
            required: true,
            index: true,
        },

        priority: {
            type: String,
            enum: ["low", "medium", "high"],
            default: "medium",
            index: true,
        },

        isRead: {
            type: Boolean,
            default: false,
            index: true,
        },

        data: {
            reservation: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Reservation",
                default: null,
            },

            donation: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Donation",
                default: null,
            },

            restaurant: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Restaurant",
                default: null,
            },

            ngo: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
                default: null,
            },

            volunteer: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
                default: null,
            },

            metadata: {
                type: mongoose.Schema.Types.Mixed,
                default: {},
            },
        },
    },
    {
        timestamps: true,
    }
);

notificationSchema.index({
    user: 1,
    createdAt: -1,
});

notificationSchema.index({
    user: 1,
    isRead: 1,
});

notificationSchema.index({
    type: 1,
});

module.exports = mongoose.model(
    "Notification",
    notificationSchema
);