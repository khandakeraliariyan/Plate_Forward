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

module.exports = {
    reserveDonationSchema,
    cancelReservationSchema,
};