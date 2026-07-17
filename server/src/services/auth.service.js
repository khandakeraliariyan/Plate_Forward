const User = require("../models/User");
const generateToken = require("../utils/generateToken");

const register = async (payload) => {
    const exists = await User.findOne({
        email: payload.email,
    });

    if (exists) {
        throw new Error("User already exists");
    }

    const user = await User.create(payload);

    const token = generateToken(user._id);

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

module.exports = {
    register,
    login,
    getMe,
};