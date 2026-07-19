const rateLimit = require("express-rate-limit");

// Stricter than the global limiter - brute-force protection on the
// credential-guessing endpoints specifically (login/register/forgot-password).
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: "Too many attempts. Please try again later.",
    },
});

module.exports = authLimiter;
