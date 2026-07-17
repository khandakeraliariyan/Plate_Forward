const { register, login, } = require("../services/auth.service");

const { registerSchema, loginSchema, } = require("../validations/auth.validation");

exports.register = async (req, res, next) => {
    try {
        const payload = registerSchema.parse(req.body);

        const data = await register(payload);

        res.status(201).json({
            success: true,
            message: "Registration successful",
            data,
        });
    } catch (error) {
        next(error);
    }
};

exports.login = async (req, res, next) => {
    try {
        const payload = loginSchema.parse(req.body);

        const data = await login(
            payload.email,
            payload.password
        );

        res.json({
            success: true,
            message: "Login successful",
            data,
        });
    } catch (error) {
        next(error);
    }
};