const mongoose = require("mongoose");

const sessionSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },

        // The raw refresh token is never stored - only its SHA-256 hash, so
        // a database leak alone can't be used to mint valid refresh tokens.
        refreshTokenHash: {
            type: String,
            required: true,
            unique: true,
        },

        userAgent: {
            type: String,
            default: "",
        },

        ip: {
            type: String,
            default: "",
        },

        rememberMe: {
            type: Boolean,
            default: false,
        },

        revoked: {
            type: Boolean,
            default: false,
        },

        revokedAt: Date,

        lastUsedAt: {
            type: Date,
            default: Date.now,
        },

        expiresAt: {
            type: Date,
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

sessionSchema.index({ user: 1, revoked: 1 });

// TTL index: MongoDB automatically removes documents once expiresAt has
// passed, so expired/abandoned sessions don't need manual cleanup.
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("Session", sessionSchema);
