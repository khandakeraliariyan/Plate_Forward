const ApiError = require("../utils/ApiError");

// Double-submit-cookie CSRF protection. It only matters for the two
// endpoints that authenticate purely via an automatically-sent cookie
// (/auth/refresh, /auth/logout) - every other mutating endpoint requires a
// Bearer token in the Authorization header, which a cross-site page cannot
// attach, so CSRF doesn't apply to them.
const CSRF_COOKIE_NAME = "csrfToken";
const CSRF_HEADER_NAME = "x-csrf-token";

const verifyCsrfToken = (req, res, next) => {
    const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];
    const headerToken = req.headers[CSRF_HEADER_NAME];

    if (!cookieToken || !headerToken || cookieToken !== headerToken) {
        return next(new ApiError(403, "Invalid or missing CSRF token."));
    }

    next();
};

module.exports = { verifyCsrfToken, CSRF_COOKIE_NAME, CSRF_HEADER_NAME };
