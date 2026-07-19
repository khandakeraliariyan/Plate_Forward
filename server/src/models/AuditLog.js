const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
            index: true,
        },

        action: {
            type: String,
            required: true,
            index: true,
        },

        success: {
            type: Boolean,
            default: true,
        },

        ip: {
            type: String,
            default: "",
            index: true,
        },

        userAgent: {
            type: String,
            default: "",
        },

        metadata: {
            type: mongoose.Schema.Types.Mixed,
            default: {},
        },
    },
    {
        timestamps: true,
    }
);

auditLogSchema.index({ action: 1, ip: 1, createdAt: -1 });

module.exports = mongoose.model("AuditLog", auditLogSchema);
