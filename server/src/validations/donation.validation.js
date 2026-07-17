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

module.exports = {
    createDonationSchema,
};