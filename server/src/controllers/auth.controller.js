const { register, login, } = require("../services/auth.service");

const { registerSchema, loginSchema, } = require("../validations/auth.validation");

const catchAsync = require("../utils/catchAsync");

exports.register = catchAsync(async (req, res) => {
    const payload = registerSchema.parse(req.body);

    const data = await register(payload);

    res.status(201).json({
        success: true,
        message: "Registration successful",
        data,
    });
});

exports.login = catchAsync(async (req, res) => {
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
});

exports.getMe = catchAsync(async (req, res) => {
    res.json({
        success: true,
        data: req.user,
    });
});