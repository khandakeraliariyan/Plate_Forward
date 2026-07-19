const User = require("../models/User");
const ApiError = require("../utils/ApiError");
const storageService = require("./storage.service");

const MAX_DOCUMENTS = 5;

const getProfile = async (userId) => {
    const user = await User.findById(userId);

    if (!user) {
        throw new ApiError(404, "User not found.");
    }

    return user;
};

const uploadAvatar = async (userId, file) => {
    const user = await getProfile(userId);

    const uploaded = await storageService.replaceFile(
        user.avatarPublicId,
        file,
        "USER_AVATAR"
    );

    user.avatar = uploaded.url;
    user.avatarPublicId = uploaded.publicId;

    await user.save();

    return user;
};

const uploadDocument = async (userId, file, label = "") => {
    const user = await getProfile(userId);

    if (user.documents.length >= MAX_DOCUMENTS) {
        throw new ApiError(
            400,
            `You cannot upload more than ${MAX_DOCUMENTS} documents.`
        );
    }

    const uploaded = await storageService.uploadFile(file, "USER_DOCUMENT");

    user.documents.push({
        url: uploaded.url,
        publicId: uploaded.publicId,
        resourceType: uploaded.resourceType,
        label,
    });

    await user.save();

    return user;
};

const deleteDocument = async (userId, documentId) => {
    const user = await getProfile(userId);

    const document = user.documents.id(documentId);

    if (!document) {
        throw new ApiError(404, "Document not found.");
    }

    await storageService.deleteFile(document.publicId, document.resourceType);

    user.documents.pull(documentId);

    await user.save();

    return user;
};

const updateNgoPreferences = async (userId, preferences) => {
    const user = await getProfile(userId);

    if (user.role !== "ngo") {
        throw new ApiError(403, "Only NGO accounts have donation preferences.");
    }

    user.ngoPreferences = {
        ...user.ngoPreferences?.toObject(),
        ...preferences,
    };

    await user.save();

    return user;
};

const updateVolunteerProfile = async (userId, profile) => {
    const user = await getProfile(userId);

    if (user.role !== "volunteer") {
        throw new ApiError(403, "Only volunteer accounts have a delivery profile.");
    }

    user.volunteerProfile = {
        ...user.volunteerProfile?.toObject(),
        ...profile,
    };

    await user.save();

    return user;
};

const updateProfile = async (userId, payload) => {
    const user = await getProfile(userId);

    Object.assign(user, payload);

    await user.save();

    return user;
};

module.exports = {
    getProfile,
    uploadAvatar,
    uploadDocument,
    deleteDocument,
    updateNgoPreferences,
    updateVolunteerProfile,
    updateProfile,
};
