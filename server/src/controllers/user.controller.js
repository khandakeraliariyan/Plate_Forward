const catchAsync = require("../utils/catchAsync");
const ApiError = require("../utils/ApiError");

const userService = require("../services/user.service");
const sessionService = require("../services/session.service");

const { ngoPreferencesSchema, recommendationsQuerySchema, volunteerProfileSchema } = require("../validations/user.validation");
const recommendationService = require("../services/recommendation.service");

exports.getProfile = catchAsync(async (req, res) => {
    const user = await userService.getProfile(req.user._id);

    res.json({
        success: true,
        data: user,
    });
});

exports.uploadAvatar = catchAsync(async (req, res) => {
    if (!req.file) {
        throw new ApiError(400, "Avatar image is required.");
    }

    const user = await userService.uploadAvatar(req.user._id, req.file);

    res.json({
        success: true,
        message: "Avatar uploaded successfully.",
        data: user,
    });
});

exports.uploadDocument = catchAsync(async (req, res) => {
    if (!req.file) {
        throw new ApiError(400, "Document file is required.");
    }

    const user = await userService.uploadDocument(
        req.user._id,
        req.file,
        req.body.label
    );

    res.status(201).json({
        success: true,
        message: "Document uploaded successfully.",
        data: user,
    });
});

exports.deleteDocument = catchAsync(async (req, res) => {
    const user = await userService.deleteDocument(
        req.user._id,
        req.params.documentId
    );

    res.json({
        success: true,
        message: "Document deleted successfully.",
        data: user,
    });
});

exports.updateNgoPreferences = catchAsync(async (req, res) => {
    const payload = ngoPreferencesSchema.parse(req.body);

    const user = await userService.updateNgoPreferences(req.user._id, payload);

    res.json({
        success: true,
        message: "Preferences updated successfully.",
        data: user,
    });
});

exports.updateVolunteerProfile = catchAsync(async (req, res) => {
    const payload = volunteerProfileSchema.parse(req.body);

    const user = await userService.updateVolunteerProfile(req.user._id, payload);

    res.json({
        success: true,
        message: "Profile updated successfully.",
        data: user,
    });
});

exports.getSessions = catchAsync(async (req, res) => {
    const sessions = await sessionService.getActiveSessions(req.user._id);

    res.json({
        success: true,
        data: sessions,
    });
});

exports.revokeSession = catchAsync(async (req, res) => {
    await sessionService.revokeSessionById(req.user._id, req.params.sessionId);

    res.json({
        success: true,
        message: "Session revoked successfully.",
    });
});

exports.getRecommendations = catchAsync(async (req, res) => {
    const query = recommendationsQuerySchema.parse(req.query);

    const result = await recommendationService.getRecommendations(
        req.user._id,
        query
    );

    res.json({
        success: true,
        message: "Recommendations fetched successfully.",
        pagination: result.pagination,
        data: result.recommendations,
    });
});
