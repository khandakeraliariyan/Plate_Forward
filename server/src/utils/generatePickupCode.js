const crypto = require("crypto");

const generatePickupCode = () => {
    return crypto
        .randomBytes(4)
        .toString("hex")
        .toUpperCase();
};

module.exports = generatePickupCode;