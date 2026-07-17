const mongoose = require("mongoose");

const restaurantSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true,
        },

        restaurantName: {
            type: String,
            required: true,
            trim: true,
        },

        ownerName: {
            type: String,
            required: true,
            trim: true,
        },

        description: {
            type: String,
            default: "",
        },

        logo: {
            type: String,
            default: "",
        },

        coverImage: {
            type: String,
            default: "",
        },

        phone: {
            type: String,
            required: true,
        },

        email: {
            type: String,
            required: true,
        },

        address: {
            type: String,
            required: true,
        },

        city: {
            type: String,
            required: true,
        },

        postalCode: {
            type: String,
            default: "",
        },

        latitude: {
            type: Number,
        },

        longitude: {
            type: Number,
        },

        operatingHours: {
            open: String,
            close: String,
        },

        foodCategories: [
            {
                type: String,
            },
        ],

        isVerified: {
            type: Boolean,
            default: false,
        },

        verificationStatus: {
            type: String,
            enum: ["pending", "approved", "rejected"],
            default: "pending",
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("Restaurant", restaurantSchema);