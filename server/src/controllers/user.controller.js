const catchAsync = require("../utils/catchAsync");
const ApiError = require("../utils/ApiError");

const userService = require("../services/user.service");

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
