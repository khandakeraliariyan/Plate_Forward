const crypto = require("crypto");

const User = require("../models/User");
const generateToken = require("../utils/generateToken");
const generateHashedToken = require("../utils/generateHashedToken");
const ApiError = require("../utils/ApiError");

const emailService = require("./email.service");

const welcomeTemplate = require("../templates/welcome.template");
const passwordResetTemplate = require("../templates/passwordReset.template");
const emailVerificationTemplate = require("../templates/emailVerification.template");

const EMAIL_VERIFICATION_EXPIRY_MS = 24 * 60 * 60 * 1000;
const RESET_PASSWORD_EXPIRY_MS = 30 * 60 * 1000;

const register = async (payload) => {
    const exists = await User.findOne({
        email: payload.email,
    });

    if (exists) {
        throw new Error("User already exists");
    }

    const user = await User.create(payload);

    const { rawToken, hashedToken } = generateHashedToken();

    user.emailVerificationToken = hashedToken;
    user.emailVerificationExpires = new Date(
        Date.now() + EMAIL_VERIFICATION_EXPIRY_MS
    );

    await user.save();

    const token = generateToken(user._id);

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

    return {
        user,
        token,
    };
};

const login = async (email, password) => {
    const user = await User.findOne({
        email,
    }).select("+password");

    if (!user) {
        throw new Error("Invalid credentials");
    }

    const matched = await user.comparePassword(password);

    if (!matched) {
        throw new Error("Invalid credentials");
    }

    if (user.isBlocked) {
        throw new Error("Your account has been blocked");
    }

    user.lastLogin = new Date();

    await user.save();

    const token = generateToken(user._id);

    return {
        user,
        token,
    };
};

const getMe = async (id) => {
    return await User.findById(id);
};

const verifyEmail = async (rawToken) => {
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

    return user;
};

const forgotPassword = async (email) => {
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
};

const resetPassword = async (rawToken, newPassword) => {
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

    return user;
};

module.exports = {
    register,
    login,
    getMe,
    verifyEmail,
    forgotPassword,
    resetPassword,
};
