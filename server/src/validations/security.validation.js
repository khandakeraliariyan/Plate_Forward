const { z } = require("zod");

const auditLogQuerySchema = z.object({
    page: z.coerce.number().min(1).optional(),

    limit: z.coerce.number().min(1).max(100).optional(),

    action: z.string().optional(),

    userId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),

    ip: z.string().optional(),
});

const blockIpSchema = z.object({
    ip: z.string().min(3),

    reason: z.string().max(300).optional(),

    durationMinutes: z.coerce.number().min(1).max(43200).optional(),
});

module.exports = { auditLogQuerySchema, blockIpSchema };
