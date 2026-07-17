const jwt = require("jsonwebtoken");

const User = require("../models/User");

const ApiError = require("../utils/ApiError");

const protect = async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith("Bearer")
    ) {
        token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
        return next(new ApiError(401, "Unauthorized"));
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const user = await User.findById(decoded.id);

        if (!user) {
            return next(new ApiError(401, "User not found"));
        }

        if (user.isBlocked) {
            return next(new ApiError(403, "Account blocked"));
        }

        req.user = user;

        next();
    } catch (error) {
        next(new ApiError(401, "Invalid Token"));
    }
};

module.exports = protect;