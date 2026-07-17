const { z } = require("zod");

const createDonationSchema = z.object({
    title: z.string().min(3).max(100),

    description: z.string().optional(),

    foodType: z.enum([
        "Cooked Meal",
        "Bakery",
        "Vegetables",
        "Fruits",
        "Dairy",
        "Beverages",
        "Snacks",
        "Frozen",
        "Other",
    ]),

    quantity: z.number().min(1),

    unit: z.enum([
        "Plate",
        "Box",
        "Package",
        "Tray",
        "Kg",
        "Liter",
        "Piece",
    ]),

    expiryTime: z.string(),

    pickupStartTime: z.string(),

    pickupEndTime: z.string(),

    pickupAddress: z.string().min(5),

    city: z.string().min(2),

    latitude: z.number().optional(),

    longitude: z.number().optional(),

    notes: z.string().optional(),
});

const donationQuerySchema = z.object({
    page: z.coerce.number().min(1).optional(),

    limit: z.coerce.number().min(1).max(100).optional(),

    search: z.string().optional(),

    city: z.string().optional(),

    foodType: z.enum([
        "Cooked Meal",
        "Bakery",
        "Vegetables",
        "Fruits",
        "Dairy",
        "Beverages",
        "Snacks",
        "Frozen",
        "Other",
    ]).optional(),

    status: z.enum([
        "available",
        "reserved",
        "picked_up",
        "completed",
        "cancelled",
        "expired",
    ]).optional(),

    sort: z.enum([
        "newest",
        "oldest",
        "expiry",
        "quantity",
    ]).optional(),
});

module.exports = {
    createDonationSchema,
    donationQuerySchema,
};