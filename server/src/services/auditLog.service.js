const AuditLog = require("../models/AuditLog");

// Fire-and-forget by design: an audit-log write failure should never break
// the request it's describing.
const record = async ({ user = null, action, success = true, ip = "", userAgent = "", metadata = {} }) => {
    try {
        await AuditLog.create({ user, action, success, ip, userAgent, metadata });
    } catch (error) {
        console.error("Audit log write failed:", error.message);
    }
};

const getLogs = async ({ page = 1, limit = 20, action, userId, ip } = {}) => {
    const filter = {};

    if (action) filter.action = action;
    if (userId) filter.user = userId;
    if (ip) filter.ip = ip;

    const currentPage = Math.max(parseInt(page, 10) || 1, 1);
    const pageSize = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const skip = (currentPage - 1) * pageSize;

    const [logs, total] = await Promise.all([
        AuditLog.find(filter)
            .populate("user", "fullName email role")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(pageSize),

        AuditLog.countDocuments(filter),
    ]);

    return {
        logs,
        pagination: {
            total,
            page: currentPage,
            limit: pageSize,
            totalPages: Math.ceil(total / pageSize),
        },
    };
};

module.exports = { record, getLogs };
