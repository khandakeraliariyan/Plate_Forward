const { z } = require("zod");

const registerSchema = z.object({
    fullName: z.string().min(3),

    email: z.string().email(),

    password: z.string().min(6),

    role: z.enum(["restaurant", "ngo", "volunteer"]).optional(),
});

const loginSchema = z.object({
    email: z.string().email(),

    password: z.string().min(6),
});

module.exports = {
    registerSchema,
    loginSchema,
};