const ApiError = require("../utils/ApiError");
const ipSecurityService = require("../services/ipSecurity.service");

// Fails open on infra errors (e.g. a transient DB hiccup) - a broken block
// check should never itself take the whole API down.
const ipBlockGuard = async (req, res, next) => {
    try {
        if (await ipSecurityService.isBlocked(req.ip)) {
            return next(
                new ApiError(403, "Access temporarily blocked due to suspicious activity.")
            );
        }

        next();
    } catch (error) {
        next();
    }
};

module.exports = ipBlockGuard;
