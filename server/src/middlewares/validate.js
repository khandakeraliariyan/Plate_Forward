const ApiError = require("../utils/ApiError");

const validate = (schema) => {
    return (req, res, next) => {
        const result = schema.safeParse({
            body: req.body,
            params: req.params,
            query: req.query,
        });

        if (!result.success) {
            return next(
                new ApiError(
                    400,
                    result.error.issues[0]?.message || "Validation failed."
                )
            );
        }

        if (result.data.body) {
            req.body = result.data.body;
        }

        if (result.data.params) {
            req.params = result.data.params;
        }

        next();
    };
};

module.exports = validate;
