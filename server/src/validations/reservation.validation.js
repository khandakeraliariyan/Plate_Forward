const { z } = require("zod");

const reserveDonationSchema = z.object({
    notes: z.string().optional(),
});

const cancelReservationSchema = z.object({
    cancellationReason: z
        .string()
        .min(5)
        .max(300),
});

const rateReservationSchema = z.object({
    score: z.coerce.number().int().min(1).max(5),

    comment: z.string().max(300).optional(),
});

const rejectReservationSchema = z.object({
    reason: z.string().min(5).max(300).optional(),
});

module.exports = {
    reserveDonationSchema,
    cancelReservationSchema,
    rateReservationSchema,
    rejectReservationSchema,
};