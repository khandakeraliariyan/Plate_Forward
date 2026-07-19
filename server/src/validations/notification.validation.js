const { z } = require("zod");

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const notificationIdSchema = z.object({
    params: z.object({
        id: z
            .string()
            .regex(objectIdRegex, "Invalid notification id"),
    }),
});

const broadcastSchema = z.object({
    body: z.object({
        title: z
            .string()
            .min(3)
            .max(150),

        message: z
            .string()
            .min(5)
            .max(1000),

        type: z
            .string()
            .default("SYSTEM"),

        priority: z.enum([
            "low",
            "medium",
            "high",
        ]),

        roles: z
            .array(
                z.enum([
                    "restaurant",
                    "ngo",
                    "volunteer",
                    "admin",
                ])
            )
            .optional(),
    }),
});

module.exports = {
    notificationIdSchema,
    broadcastSchema,
};