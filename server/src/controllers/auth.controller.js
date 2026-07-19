const crypto = require("crypto");

const {
    register,
    login,
    refreshAccessToken,
    logout,
    logoutAll,
    changePassword,
    verifyEmail,
    forgotPassword,
    resetPassword,
} = require("../services/auth.service");

const {
    registerSchema,
    loginSchema,
    forgotPasswordSchema,
    resetPasswordSchema,
    changePasswordSchema,
} = require("../validations/auth.validation");

const catchAsync = require("../utils/catchAsync");
const { CSRF_COOKIE_NAME } = require("../middlewares/csrf");

const REFRESH_COOKIE_NAME = "refreshToken";
const REFRESH_COOKIE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days (upper bound - actual expiry is enforced server-side per Session)

const requestContext = (req) => ({
    ip: req.ip,
    userAgent: req.headers["user-agent"],
});

const cookieOptions = (extra = {}) => ({
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    ...extra,
});

const setRefreshCookie = (res, refreshToken) => {
    res.cookie(
        REFRESH_COOKIE_NAME,
        refreshToken,
        cookieOptions({ httpOnly: true, maxAge: REFRESH_COOKIE_MAX_AGE_MS })
    );

    // Readable by the client on purpose (double-submit CSRF pattern) - it
    // is not a secret on its own, it only proves the request came from a
    // page that could read this origin's cookies.
    res.cookie(
        CSRF_COOKIE_NAME,
        crypto.randomBytes(24).toString("hex"),
        cookieOptions({ httpOnly: false, maxAge: REFRESH_COOKIE_MAX_AGE_MS })
    );
};

const clearRefreshCookie = (res) => {
    res.clearCookie(REFRESH_COOKIE_NAME, cookieOptions({ httpOnly: true }));
    res.clearCookie(CSRF_COOKIE_NAME, cookieOptions({ httpOnly: false }));
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

    await logout(rawRefreshToken, requestContext(req));

    clearRefreshCookie(res);

    res.json({
        success: true,
        message: "Logged out successfully.",
    });
});

exports.logoutAll = catchAsync(async (req, res) => {
    await logoutAll(req.user._id, requestContext(req));

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
    await verifyEmail(req.params.token, requestContext(req));

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

exports.changePassword = catchAsync(async (req, res) => {
    const payload = changePasswordSchema.parse(req.body);

    await changePassword(
        req.user._id,
        payload.currentPassword,
        payload.newPassword,
        requestContext(req)
    );

    clearRefreshCookie(res);

    res.json({
        success: true,
        message: "Password changed successfully. Please log in again.",
    });
});
