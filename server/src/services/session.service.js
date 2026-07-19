const crypto = require("crypto");

const Session = require("../models/Session");
const ApiError = require("../utils/ApiError");
const generateHashedToken = require("../utils/generateHashedToken");

const SESSION_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const REMEMBER_ME_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

const hashToken = (rawToken) =>
    crypto.createHash("sha256").update(rawToken).digest("hex");

const createSession = async (userId, { userAgent, ip, rememberMe = false } = {}) => {
    const { rawToken, hashedToken } = generateHashedToken();

    const expiresAt = new Date(
        Date.now() + (rememberMe ? REMEMBER_ME_EXPIRY_MS : SESSION_EXPIRY_MS)
    );

    const session = await Session.create({
        user: userId,
        refreshTokenHash: hashedToken,
        userAgent: userAgent || "",
        ip: ip || "",
        rememberMe,
        expiresAt,
    });

    return { session, refreshToken: rawToken };
};

// Rotation: every refresh call issues a brand-new refresh token and
// invalidates the previous one, so a stolen-but-unused old token can't be
// replayed after the legitimate client has refreshed.
const rotateSession = async (rawRefreshToken, { userAgent, ip } = {}) => {
    const session = await Session.findOne({
        refreshTokenHash: hashToken(rawRefreshToken),
        revoked: false,
    });

    if (!session || session.expiresAt < new Date()) {
        throw new ApiError(401, "Invalid or expired session. Please log in again.");
    }

    const { rawToken, hashedToken } = generateHashedToken();

    session.refreshTokenHash = hashedToken;
    session.lastUsedAt = new Date();
    session.userAgent = userAgent || session.userAgent;
    session.ip = ip || session.ip;

    // "Remember me" sessions slide forward on every refresh; regular
    // sessions keep their original fixed expiry.
    if (session.rememberMe) {
        session.expiresAt = new Date(Date.now() + REMEMBER_ME_EXPIRY_MS);
    }

    await session.save();

    return { session, refreshToken: rawToken };
};

const revokeSessionByToken = async (rawRefreshToken) => {
    await Session.updateOne(
        { refreshTokenHash: hashToken(rawRefreshToken) },
        { revoked: true, revokedAt: new Date() }
    );
};

const revokeSessionById = async (userId, sessionId) => {
    const session = await Session.findOne({ _id: sessionId, user: userId });

    if (!session) {
        throw new ApiError(404, "Session not found.");
    }

    session.revoked = true;
    session.revokedAt = new Date();

    await session.save();

    return session;
};

const revokeAllSessions = async (userId, { exceptSessionId } = {}) => {
    const filter = { user: userId, revoked: false };

    if (exceptSessionId) {
        filter._id = { $ne: exceptSessionId };
    }

    await Session.updateMany(filter, { revoked: true, revokedAt: new Date() });
};

const getActiveSessions = async (userId) => {
    return Session.find({
        user: userId,
        revoked: false,
        expiresAt: { $gt: new Date() },
    })
        .select("-refreshTokenHash")
        .sort({ lastUsedAt: -1 });
};

module.exports = {
    createSession,
    rotateSession,
    revokeSessionByToken,
    revokeSessionById,
    revokeAllSessions,
    getActiveSessions,
};
