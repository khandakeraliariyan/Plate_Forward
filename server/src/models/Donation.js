const mongoose = require("mongoose");

const donationSchema = new mongoose.Schema(
    {
        restaurant: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Restaurant",
            required: true,
            index: true,
        },

        title: {
            type: String,
            required: true,
            trim: true,
        },

        description: {
            type: String,
            default: "",
            trim: true,
        },

        foodType: {
            type: String,
            enum: [
                "Cooked Meal",
                "Bakery",
                "Vegetables",
                "Fruits",
                "Dairy",
                "Beverages",
                "Snacks",
                "Frozen",
                "Other",
            ],
            required: true,
        },

        quantity: {
            type: Number,
            required: true,
            min: 1,
        },

        unit: {
            type: String,
            enum: [
                "Plate",
                "Box",
                "Package",
                "Tray",
                "Kg",
                "Liter",
                "Piece",
            ],
            required: true,
        },

        expiryTime: {
            type: Date,
            required: true,
        },

        pickupStartTime: {
            type: Date,
            required: true,
        },

        pickupEndTime: {
            type: Date,
            required: true,
        },

        image: {
            type: String,
            default: "",
        },

        pickupAddress: {
            type: String,
            required: true,
        },

        city: {
            type: String,
            required: true,
            index: true,
        },

        latitude: Number,

        longitude: Number,

        status: {
            type: String,
            enum: [
                "available",
                "reserved",
                "picked_up",
                "completed",
                "cancelled",
                "expired",
            ],
            default: "available",
            index: true,
        },

        reservedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },

        volunteer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },

        completedAt: Date,

        notes: {
            type: String,
            default: "",
        },
    },
    {
        timestamps: true,
    }
);

donationSchema.index({
    city: 1,
    status: 1,
});

module.exports = mongoose.model(
    "Donation",
    donationSchema
);