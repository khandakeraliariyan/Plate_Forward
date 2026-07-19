const { z } = require("zod");

const objectIdRegex = /^[0-9a-fA-F]{24}$/;
const objectId = z.string().regex(objectIdRegex, "Invalid id");

const listUsersQuerySchema = z.object({
    page: z.coerce.number().min(1).optional(),

    limit: z.coerce.number().min(1).max(100).optional(),

    role: z.enum(["restaurant", "ngo", "volunteer", "admin"]).optional(),

    isBlocked: z.coerce.boolean().optional(),

    search: z.string().optional(),
});

const suspendUserSchema = z.object({
    isBlocked: z.boolean(),

    reason: z.string().max(300).optional(),
});

const verifyRestaurantSchema = z.object({
    isVerified: z.boolean().optional(),

    verificationStatus: z.enum(["pending", "approved", "rejected"]).optional(),
});

const adminDonationsQuerySchema = z.object({
    page: z.coerce.number().min(1).optional(),

    limit: z.coerce.number().min(1).max(100).optional(),

    status: z
        .enum(["available", "reserved", "picked_up", "delivered", "completed", "cancelled", "expired"])
        .optional(),

    restaurant: objectId.optional(),
});

const forceDeleteDonationSchema = z.object({
    reason: z.string().max(300).optional(),
});

const adminReservationsQuerySchema = z.object({
    page: z.coerce.number().min(1).optional(),

    limit: z.coerce.number().min(1).max(100).optional(),

    status: z
        .enum(["reserved", "accepted", "picked_up", "delivered", "completed", "cancelled", "expired"])
        .optional(),
});

const forceCancelReservationSchema = z.object({
    reason: z.string().max(300).optional(),
});

module.exports = {
    listUsersQuerySchema,
    suspendUserSchema,
    verifyRestaurantSchema,
    adminDonationsQuerySchema,
    forceDeleteDonationSchema,
    adminReservationsQuerySchema,
    forceCancelReservationSchema,
};
