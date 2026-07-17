const { z } = require("zod");

const createRestaurantSchema = z.object({
    restaurantName: z.string().min(3),

    ownerName: z.string().min(3),

    description: z.string().optional(),

    phone: z.string().min(6),

    email: z.string().email(),

    address: z.string().min(5),

    city: z.string().min(2),

    postalCode: z.string().optional(),

    latitude: z.number().optional(),

    longitude: z.number().optional(),

    operatingHours: z
        .object({
            open: z.string(),

            close: z.string(),
        })
        .optional(),

    foodCategories: z.array(z.string()).optional(),
});

module.exports = {
    createRestaurantSchema,
};