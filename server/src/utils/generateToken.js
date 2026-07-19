const jwt = require("jsonwebtoken");

// Access tokens are now short-lived (Module 19 refresh-token flow) - the
// long-lived JWT_EXPIRES_IN behavior from before is kept as a fallback for
// any caller that doesn't pass an explicit expiry.
const ACCESS_TOKEN_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN || "15m";

const generateToken = (userId, expiresIn = ACCESS_TOKEN_EXPIRES_IN) => {
    return jwt.sign(
        {
            id: userId,
        },
        process.env.JWT_SECRET,
        {
            expiresIn: expiresIn || process.env.JWT_EXPIRES_IN,
        }
    );
};

module.exports = generateToken;