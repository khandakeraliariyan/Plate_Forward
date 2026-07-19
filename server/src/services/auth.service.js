const crypto = require("crypto");

const User = require("../models/User");
const generateToken = require("../utils/generateToken");
const generateHashedToken = require("../utils/generateHashedToken");
const ApiError = require("../utils/ApiError");

const emailService = require("./email.service");
const sessionService = require("./session.service");
const auditLogService = require("./auditLog.service");
const ipSecurityService = require("./ipSecurity.service");

const welcomeTemplate = require("../templates/welcome.template");
const passwordResetTemplate = require("../templates/passwordReset.template");
const emailVerificationTemplate = require("../templates/emailVerification.template");

const EMAIL_VERIFICATION_EXPIRY_MS = 24 * 60 * 60 * 1000;
const RESET_PASSWORD_EXPIRY_MS = 30 * 60 * 1000;

const register = async (payload, context = {}) => {
    const exists = await User.findOne({
        email: payload.email,
    });

    if (exists) {
        throw new ApiError(400, "User already exists");
    }

    const user = await User.create(payload);

    const { rawToken, hashedToken } = generateHashedToken();

    user.emailVerificationToken = hashedToken;
    user.emailVerificationExpires = new Date(
        Date.now() + EMAIL_VERIFICATION_EXPIRY_MS
    );

    await user.save();

    const accessToken = generateToken(user._id);

    const { refreshToken } = await sessionService.createSession(user._id, {
        userAgent: context.userAgent,
        ip: context.ip,
        rememberMe: false,
    });

    await emailService.sendTemplateEmail({
        to: user.email,
        subject: "Welcome to PlateForward",
        template: welcomeTemplate,
        data: {
            name: user.fullName,
        },
    });

    await emailService.sendTemplateEmail({
        to: user.email,
        subject: "Verify Your Email",
        template: emailVerificationTemplate,
        data: {
            name: user.fullName,
            verificationUrl: `${process.env.CLIENT_URL}/verify-email/${rawToken}`,
        },
    });

    await auditLogService.record({
        user: user._id,
        action: "REGISTER",
        ip: context.ip,
        userAgent: context.userAgent,
    });

    return {
        user,
        accessToken,
        refreshToken,
    };
};

const login = async (email, password, context = {}) => {
    if (await ipSecurityService.isBlocked(context.ip)) {
        throw new ApiError(
            403,
            "Access temporarily blocked due to suspicious activity."
        );
    }

    const user = await User.findOne({
        email,
    }).select("+password");

    const matched = user ? await user.comparePassword(password) : false;

    if (!user || !matched) {
        await auditLogService.record({
            user: user?._id,
            action: "LOGIN_FAILED",
            success: false,
            ip: context.ip,
            userAgent: context.userAgent,
            metadata: { email },
        });

        await ipSecurityService.checkAndAutoBlock(context.ip);

        throw new ApiError(401, "Invalid credentials");
    }

    if (user.isBlocked) {
        await auditLogService.record({
            user: user._id,
            action: "LOGIN_FAILED",
            success: false,
            ip: context.ip,
            userAgent: context.userAgent,
            metadata: { reason: "account_blocked" },
        });

        throw new ApiError(403, "Your account has been blocked");
    }

    user.lastLogin = new Date();

    await user.save();

    const accessToken = generateToken(user._id);

    const { refreshToken } = await sessionService.createSession(user._id, {
        userAgent: context.userAgent,
        ip: context.ip,
        rememberMe: !!context.rememberMe,
    });

    await auditLogService.record({
        user: user._id,
        action: "LOGIN_SUCCESS",
        ip: context.ip,
        userAgent: context.userAgent,
    });

    return {
        user,
        accessToken,
        refreshToken,
    };
};

const refreshAccessToken = async (rawRefreshToken, context = {}) => {
    if (!rawRefreshToken) {
        throw new ApiError(401, "No refresh token provided.");
    }

    const { session, refreshToken } = await sessionService.rotateSession(
        rawRefreshToken,
        context
    );

    const accessToken = generateToken(session.user);

    return { accessToken, refreshToken };
};

const logout = async (rawRefreshToken, context = {}) => {
    if (rawRefreshToken) {
        const userId = await sessionService.revokeSessionByToken(rawRefreshToken);

        await auditLogService.record({
            user: userId,
            action: "LOGOUT",
            ip: context.ip,
            userAgent: context.userAgent,
        });
    }
};

const logoutAll = async (userId, context = {}) => {
    await sessionService.revokeAllSessions(userId);

    await auditLogService.record({
        user: userId,
        action: "LOGOUT_ALL",
        ip: context.ip,
        userAgent: context.userAgent,
    });
};

const getMe = async (id) => {
    return await User.findById(id);
};

const verifyEmail = async (rawToken, context = {}) => {
    const hashedToken = crypto
        .createHash("sha256")
        .update(rawToken)
        .digest("hex");

    const user = await User.findOne({
        emailVerificationToken: hashedToken,
        emailVerificationExpires: {
            $gt: new Date(),
        },
    }).select("+emailVerificationToken +emailVerificationExpires");

    if (!user) {
        throw new ApiError(400, "Invalid or expired verification token.");
    }

    user.isVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;

    await user.save();

    await auditLogService.record({
        user: user._id,
        action: "EMAIL_VERIFIED",
        ip: context.ip,
        userAgent: context.userAgent,
    });

    return user;
};

const forgotPassword = async (email, context = {}) => {
    const user = await User.findOne({
        email,
    });

    if (!user) {
        // Do not reveal whether the account exists
        return;
    }

    const { rawToken, hashedToken } = generateHashedToken();

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = new Date(
        Date.now() + RESET_PASSWORD_EXPIRY_MS
    );

    await user.save();

    await emailService.sendTemplateEmail({
        to: user.email,
        subject: "Reset Your Password",
        template: passwordResetTemplate,
        data: {
            name: user.fullName,
            resetUrl: `${process.env.CLIENT_URL}/reset-password/${rawToken}`,
        },
    });

    await auditLogService.record({
        user: user._id,
        action: "PASSWORD_RESET_REQUESTED",
        ip: context.ip,
        userAgent: context.userAgent,
    });
};

const resetPassword = async (rawToken, newPassword, context = {}) => {
    const hashedToken = crypto
        .createHash("sha256")
        .update(rawToken)
        .digest("hex");

    const user = await User.findOne({
        resetPasswordToken: hashedToken,
        resetPasswordExpires: {
            $gt: new Date(),
        },
    }).select("+resetPasswordToken +resetPasswordExpires");

    if (!user) {
        throw new ApiError(400, "Invalid or expired reset token.");
    }

    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();

    // A password reset is a strong signal of compromise-recovery intent -
    // revoke every existing session so old, possibly-stolen sessions can't
    // keep using the account.
    await sessionService.revokeAllSessions(user._id);

    await auditLogService.record({
        user: user._id,
        action: "PASSWORD_RESET_COMPLETED",
        ip: context.ip,
        userAgent: context.userAgent,
    });

    return user;
};

module.exports = {
    register,
    login,
    refreshAccessToken,
    logout,
    logoutAll,
    getMe,
    verifyEmail,
    forgotPassword,
    resetPassword,
};
