const crypto = require("crypto");

// Generic AES-256-GCM field-level encryption helper (Module 19). Nothing in
// the current schema needs *reversible* encryption yet - passwords are
// correctly one-way hashed via bcrypt, and refresh/reset/verification
// tokens are correctly one-way hashed via SHA-256 (see generateHashedToken).
// This utility exists so a future sensitive, need-to-decrypt field (e.g. a
// stored ID number) has a ready, tested place to plug into rather than a
// bespoke one-off. Transport encryption (HTTPS/TLS) is a deployment concern
// handled by the hosting layer, not application code.
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

const getKey = () => {
    const key = process.env.ENCRYPTION_KEY;

    if (!key || key.length !== 64) {
        throw new Error(
            "ENCRYPTION_KEY must be set to a 64-character hex string (32 bytes)."
        );
    }

    return Buffer.from(key, "hex");
};

const encrypt = (plainText) => {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);

    const encrypted = Buffer.concat([
        cipher.update(plainText, "utf8"),
        cipher.final(),
    ]);

    const authTag = cipher.getAuthTag();

    return [iv, authTag, encrypted].map((buf) => buf.toString("hex")).join(":");
};

const decrypt = (payload) => {
    const [ivHex, authTagHex, encryptedHex] = payload.split(":");

    const decipher = crypto.createDecipheriv(
        ALGORITHM,
        getKey(),
        Buffer.from(ivHex, "hex")
    );

    decipher.setAuthTag(Buffer.from(authTagHex, "hex"));

    return Buffer.concat([
        decipher.update(Buffer.from(encryptedHex, "hex")),
        decipher.final(),
    ]).toString("utf8");
};

module.exports = { encrypt, decrypt };
