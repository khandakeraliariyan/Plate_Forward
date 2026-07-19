const {
    register,
    login,
    refreshAccessToken,
    logout,
    logoutAll,
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
const ApiError = require("../utils/ApiError");

const REFRESH_COOKIE_NAME = "refreshToken";
const REFRESH_COOKIE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days (upper bound - actual expiry is enforced server-side per Session)

const requestContext = (req) => ({
    ip: req.ip,
    userAgent: req.headers["user-agent"],
});

const setRefreshCookie = (res, refreshToken) => {
    res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: REFRESH_COOKIE_MAX_AGE_MS,
    });
};

const clearRefreshCookie = (res) => {
    res.clearCookie(REFRESH_COOKIE_NAME, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
    });
};

exports.register = catchAsync(async (req, res) => {
    const payload = registerSchema.parse(req.body);

    const { user, accessToken, refreshToken } = await register(
        payload,
        requestContext(req)
    );

    setRefreshCookie(res, refreshToken);

    res.status(201).json({
        success: true,
        message: "Registration successful",
        data: { user, accessToken },
    });
});

exports.login = catchAsync(async (req, res) => {
    const payload = loginSchema.parse(req.body);

    const { user, accessToken, refreshToken } = await login(
        payload.email,
        payload.password,
        { ...requestContext(req), rememberMe: payload.rememberMe }
    );

    setRefreshCookie(res, refreshToken);

    res.json({
        success: true,
        message: "Login successful",
        data: { user, accessToken },
    });
});

exports.refresh = catchAsync(async (req, res) => {
    const rawRefreshToken = req.cookies?.[REFRESH_COOKIE_NAME];

    const { accessToken, refreshToken } = await refreshAccessToken(
        rawRefreshToken,
        requestContext(req)
    );

    setRefreshCookie(res, refreshToken);

    res.json({
        success: true,
        data: { accessToken },
    });
});

exports.logout = catchAsync(async (req, res) => {
    const rawRefreshToken = req.cookies?.[REFRESH_COOKIE_NAME];

    await logout(rawRefreshToken);

    clearRefreshCookie(res);

    res.json({
        success: true,
        message: "Logged out successfully.",
    });
});

exports.logoutAll = catchAsync(async (req, res) => {
    await logoutAll(req.user._id);

    clearRefreshCookie(res);

    res.json({
        success: true,
        message: "Logged out of all devices.",
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

    await forgotPassword(payload.email, requestContext(req));

    res.json({
        success: true,
        message: "If an account exists for this email, a reset link has been sent",
    });
});

exports.resetPassword = catchAsync(async (req, res) => {
    const payload = resetPasswordSchema.parse(req.body);

    await resetPassword(req.params.token, payload.password, requestContext(req));

    res.json({
        success: true,
        message: "Password reset successful",
    });
});
