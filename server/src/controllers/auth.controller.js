const {
    register,
    login,
    verifyEmail,
    forgotPassword,
    resetPassword,
} = require("../services/auth.service");

const {
    registerSchema,
    loginSchema,
    forgotPasswordSchema,
    resetPasswordSchema,
} = require("../validations/auth.validation");

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

exports.verifyEmail = catchAsync(async (req, res) => {
    await verifyEmail(req.params.token);

    res.json({
        success: true,
        message: "Email verified successfully",
    });
});

exports.forgotPassword = catchAsync(async (req, res) => {
    const payload = forgotPasswordSchema.parse(req.body);

    await forgotPassword(payload.email);

    res.json({
        success: true,
        message: "If an account exists for this email, a reset link has been sent",
    });
});

exports.resetPassword = catchAsync(async (req, res) => {
    const payload = resetPasswordSchema.parse(req.body);

    await resetPassword(req.params.token, payload.password);

    res.json({
        success: true,
        message: "Password reset successful",
    });
});