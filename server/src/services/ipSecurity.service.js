const AuditLog = require("../models/AuditLog");
const BlockedIp = require("../models/BlockedIp");

const FAILED_LOGIN_WINDOW_MS = 15 * 60 * 1000;
const FAILED_LOGIN_THRESHOLD = 5;
const AUTO_BLOCK_DURATION_MS = 30 * 60 * 1000;
const MANUAL_BLOCK_DEFAULT_DURATION_MS = 24 * 60 * 60 * 1000;

// Called after a failed login. If this IP has racked up too many failed
// attempts in the trailing window, auto-block it for a cooldown period.
const checkAndAutoBlock = async (ip) => {
    if (!ip) return;

    const since = new Date(Date.now() - FAILED_LOGIN_WINDOW_MS);

    const failedCount = await AuditLog.countDocuments({
        action: "LOGIN_FAILED",
        ip,
        createdAt: { $gte: since },
    });

    if (failedCount >= FAILED_LOGIN_THRESHOLD) {
        await BlockedIp.findOneAndUpdate(
            { ip },
            {
                ip,
                reason: `Auto-blocked after ${failedCount} failed login attempts within ${FAILED_LOGIN_WINDOW_MS / 60000} minutes.`,
                blockedUntil: new Date(Date.now() + AUTO_BLOCK_DURATION_MS),
                createdBy: null,
            },
            { upsert: true, new: true }
        );
    }
};

const isBlocked = async (ip) => {
    if (!ip) return false;

    const block = await BlockedIp.findOne({ ip, blockedUntil: { $gt: new Date() } });

    return !!block;
};

const blockIp = async (ip, reason, adminId, durationMs = MANUAL_BLOCK_DEFAULT_DURATION_MS) => {
    return BlockedIp.findOneAndUpdate(
        { ip },
        {
            ip,
            reason: reason || "Manually blocked by admin.",
            blockedUntil: new Date(Date.now() + durationMs),
            createdBy: adminId,
        },
        { upsert: true, new: true }
    );
};

const unblockIp = async (ip) => {
    await BlockedIp.deleteOne({ ip });
};

const listBlockedIps = async () => {
    return BlockedIp.find({ blockedUntil: { $gt: new Date() } }).sort({ createdAt: -1 });
};

module.exports = {
    checkAndAutoBlock,
    isBlocked,
    blockIp,
    unblockIp,
    listBlockedIps,
};
