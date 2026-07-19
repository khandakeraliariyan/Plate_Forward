const catchAsync = require("../utils/catchAsync");

const auditLogService = require("../services/auditLog.service");
const ipSecurityService = require("../services/ipSecurity.service");

const { auditLogQuerySchema, blockIpSchema } = require("../validations/security.validation");

exports.getAuditLogs = catchAsync(async (req, res) => {
    const query = auditLogQuerySchema.parse(req.query);

    const result = await auditLogService.getLogs(query);

    res.json({
        success: true,
        pagination: result.pagination,
        data: result.logs,
    });
});

exports.getBlockedIps = catchAsync(async (req, res) => {
    const blockedIps = await ipSecurityService.listBlockedIps();

    res.json({
        success: true,
        data: blockedIps,
    });
});

exports.blockIp = catchAsync(async (req, res) => {
    const payload = blockIpSchema.parse(req.body);

    const durationMs = payload.durationMinutes
        ? payload.durationMinutes * 60 * 1000
        : undefined;

    const block = await ipSecurityService.blockIp(
        payload.ip,
        payload.reason,
        req.user._id,
        durationMs
    );

    res.status(201).json({
        success: true,
        message: "IP blocked successfully.",
        data: block,
    });
});

exports.unblockIp = catchAsync(async (req, res) => {
    await ipSecurityService.unblockIp(req.params.ip);

    res.json({
        success: true,
        message: "IP unblocked successfully.",
    });
});
