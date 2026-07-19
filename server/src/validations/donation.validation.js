const { z } = require("zod");

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

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

    quantity: z.coerce.number().min(1),

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

    latitude: z.coerce.number().optional(),

    longitude: z.coerce.number().optional(),

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

    restaurant: z
        .string()
        .regex(objectIdRegex, "Invalid restaurant id")
        .optional(),

    lat: z.coerce.number().min(-90).max(90).optional(),

    lng: z.coerce.number().min(-180).max(180).optional(),

    radius: z.coerce.number().positive().max(500).optional(),

    minQuantity: z.coerce.number().min(0).optional(),

    maxQuantity: z.coerce.number().min(0).optional(),

    expiryBefore: z.string().optional(),

    expiryAfter: z.string().optional(),

    availableNow: z.coerce.boolean().optional(),

    sort: z.enum([
        "newest",
        "oldest",
        "expiry",
        "quantity",
        "distance",
        "relevance",
    ]).optional(),
})
    .refine(
        (data) => (data.lat === undefined) === (data.lng === undefined),
        {
            message: "lat and lng must be provided together.",
            path: ["lat"],
        }
    )
    .refine(
        (data) => !data.radius || (data.lat !== undefined && data.lng !== undefined),
        {
            message: "radius requires both lat and lng.",
            path: ["radius"],
        }
    )
    .refine(
        (data) => data.sort !== "distance" || (data.lat !== undefined && data.lng !== undefined),
        {
            message: "Sorting by distance requires both lat and lng.",
            path: ["sort"],
        }
    )
    .refine(
        (data) => data.sort !== "relevance" || !!data.search,
        {
            message: "Sorting by relevance requires a search term.",
            path: ["sort"],
        }
    );

module.exports = {
    createDonationSchema,
    donationQuerySchema,
};