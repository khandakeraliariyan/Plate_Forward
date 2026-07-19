const mongoose = require("mongoose");

const blockedIpSchema = new mongoose.Schema(
    {
        ip: {
            type: String,
            required: true,
            unique: true,
        },

        reason: {
            type: String,
            default: "",
        },

        blockedUntil: {
            type: Date,
            required: true,
        },

        // null means the system auto-blocked this IP (too many failed
        // logins); otherwise the admin who blocked it manually.
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

// TTL index: the block lifts itself automatically once blockedUntil passes.
blockedIpSchema.index({ blockedUntil: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("BlockedIp", blockedIpSchema);
