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

        // Set once an "expiring soon" reminder has been sent, so the hourly
        // reminder job doesn't re-notify the restaurant every run.
        reminderSentAt: {
            type: Date,
            default: null,
        },

        pickupStartTime: {
            type: Date,
            required: true,
        },

        pickupEndTime: {
            type: Date,
            required: true,
        },

        images: [
            {
                url: {
                    type: String,
                    required: true,
                },

                publicId: {
                    type: String,
                    required: true,
                },
            },
        ],

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

        // Derived from latitude/longitude for geospatial ($geoNear/$near)
        // queries, which require a GeoJSON field with a 2dsphere index.
        location: {
            type: new mongoose.Schema(
                {
                    type: {
                        type: String,
                        enum: ["Point"],
                        default: "Point",
                    },

                    coordinates: {
                        type: [Number],
                        default: undefined,
                    },
                },
                { _id: false }
            ),

            default: undefined,
        },

        status: {
            type: String,
            enum: [
                "available",
                "reserved",
                "picked_up",
                "delivered",
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

        // Heuristic fraud-detection flags (Module 16), non-blocking - set
        // at creation time and surfaced to admins for review.
        fraudFlags: [
            {
                type: {
                    type: String,
                    enum: ["duplicate", "spam"],
                    required: true,
                },

                reason: {
                    type: String,
                    required: true,
                },

                relatedDonation: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "Donation",
                    default: null,
                },

                detectedAt: {
                    type: Date,
                    default: Date.now,
                },
            },
        ],
    },
    {
        timestamps: true,
    }
);

donationSchema.index({
    city: 1,
    status: 1,
});

donationSchema.index({
    location: "2dsphere",
});

donationSchema.index({
    title: "text",
    description: "text",
});

donationSchema.pre("save", function () {
    if (this.isModified("latitude") || this.isModified("longitude")) {
        if (typeof this.latitude === "number" && typeof this.longitude === "number") {
            this.location = {
                type: "Point",
                coordinates: [this.longitude, this.latitude],
            };
        } else {
            this.location = undefined;
        }
    }
});

module.exports = mongoose.model(
    "Donation",
    donationSchema
);