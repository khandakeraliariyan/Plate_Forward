const { z } = require("zod");

const ngoPreferencesSchema = z.object({
    address: z.string().optional(),

    latitude: z.coerce.number().min(-90).max(90).optional(),

    longitude: z.coerce.number().min(-180).max(180).optional(),

    preferredFoodTypes: z
        .array(
            z.enum([
                "Cooked Meal",
                "Bakery",
                "Vegetables",
                "Fruits",
                "Dairy",
                "Beverages",
                "Snacks",
                "Frozen",
                "Other",
            ])
        )
        .optional(),

    maxDistanceKm: z.coerce.number().min(1).optional(),

    minQuantity: z.coerce.number().min(0).optional(),
}).refine(
    (data) => (data.latitude === undefined) === (data.longitude === undefined),
    {
        message: "latitude and longitude must be provided together.",
        path: ["latitude"],
    }
);

const recommendationsQuerySchema = z.object({
    limit: z.coerce.number().min(1).max(50).optional(),

    page: z.coerce.number().min(1).optional(),
});

const volunteerProfileSchema = z.object({
    address: z.string().optional(),

    latitude: z.coerce.number().min(-90).max(90).optional(),

    longitude: z.coerce.number().min(-180).max(180).optional(),

    maxDistanceKm: z.coerce.number().min(1).optional(),
}).refine(
    (data) => (data.latitude === undefined) === (data.longitude === undefined),
    {
        message: "latitude and longitude must be provided together.",
        path: ["latitude"],
    }
);

module.exports = {
    ngoPreferencesSchema,
    recommendationsQuerySchema,
    volunteerProfileSchema,
};
