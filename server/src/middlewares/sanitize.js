// Custom, dependency-free sanitizer (Module 19). express-mongo-sanitize and
// xss-clean both try to reassign req.query, which Express 5 makes
// non-writable (a known incompatibility) - this mutates each object's own
// keys in place instead, which stays compatible.
const stripHtmlTags = (value) => value.replace(/<[^>]*>/g, "");

const sanitizeValue = (value) => {
    return typeof value === "string" ? stripHtmlTags(value) : value;
};

const sanitizeObject = (obj) => {
    if (!obj || typeof obj !== "object") {
        return;
    }

    for (const key of Object.keys(obj)) {
        // Strip Mongo operator injection: keys like "$gt" or "a.b" let an
        // attacker smuggle query operators through a JSON body/query string.
        if (key.startsWith("$") || key.includes(".")) {
            delete obj[key];
            continue;
        }

        const value = obj[key];

        if (value && typeof value === "object") {
            sanitizeObject(value);
        } else {
            obj[key] = sanitizeValue(value);
        }
    }
};

const sanitizeRequest = (req, res, next) => {
    sanitizeObject(req.body);
    sanitizeObject(req.params);
    sanitizeObject(req.query);

    next();
};

module.exports = sanitizeRequest;
