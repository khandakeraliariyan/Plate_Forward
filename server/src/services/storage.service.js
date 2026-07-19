const cloudinary = require("../config/cloudinary");
const ApiError = require("../utils/ApiError");

// Named presets keep resize/compression/format rules consistent across
// every place a given image category is uploaded.
const PRESETS = {
    RESTAURANT_LOGO: {
        folder: "plateforward/restaurants/logos",
        transformation: [
            { width: 400, height: 400, crop: "fill", gravity: "auto" },
            { quality: "auto", fetch_format: "auto" },
        ],
    },
    RESTAURANT_COVER: {
        folder: "plateforward/restaurants/covers",
        transformation: [
            { width: 1200, height: 400, crop: "fill", gravity: "auto" },
            { quality: "auto", fetch_format: "auto" },
        ],
    },
    RESTAURANT_GALLERY: {
        folder: "plateforward/restaurants/gallery",
        transformation: [
            { width: 1000, height: 750, crop: "limit" },
            { quality: "auto", fetch_format: "auto" },
        ],
    },
    DONATION_IMAGE: {
        folder: "plateforward/donations",
        transformation: [
            { width: 1000, height: 750, crop: "limit" },
            { quality: "auto", fetch_format: "auto" },
        ],
    },
    USER_AVATAR: {
        folder: "plateforward/users/avatars",
        transformation: [
            { width: 400, height: 400, crop: "fill", gravity: "face" },
            { quality: "auto", fetch_format: "auto" },
        ],
    },
    USER_DOCUMENT: {
        folder: "plateforward/users/documents",
        transformation: [],
    },
};

const bufferToDataUri = (file) => {
    return `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
};

const resourceTypeFor = (file) => {
    return file.mimetype === "application/pdf" ? "raw" : "image";
};

const uploadFile = async (file, presetName, options = {}) => {
    const preset = PRESETS[presetName];

    if (!preset) {
        throw new ApiError(500, `Unknown upload preset "${presetName}".`);
    }

    try {
        const result = await cloudinary.uploader.upload(bufferToDataUri(file), {
            folder: preset.folder,
            transformation: preset.transformation,
            resource_type: resourceTypeFor(file),
            ...options,
        });

        return {
            url: result.secure_url,
            publicId: result.public_id,
            resourceType: result.resource_type,
            format: result.format,
            width: result.width,
            height: result.height,
            bytes: result.bytes,
        };
    } catch (error) {
        throw new ApiError(502, `File upload failed: ${error.message}`);
    }
};

const uploadFiles = async (files, presetName, options = {}) => {
    return Promise.all(files.map((file) => uploadFile(file, presetName, options)));
};

const deleteFile = async (publicId, resourceType = "image") => {
    if (!publicId) {
        return;
    }

    try {
        await cloudinary.uploader.destroy(publicId, {
            resource_type: resourceType,
        });
    } catch (error) {
        throw new ApiError(502, `File deletion failed: ${error.message}`);
    }
};

const deleteFiles = async (publicIds, resourceType = "image") => {
    await Promise.all(
        publicIds
            .filter(Boolean)
            .map((publicId) => deleteFile(publicId, resourceType))
    );
};

// Uploads the replacement first so an existing file is never lost if the
// new upload fails, then removes the old one.
const replaceFile = async (oldPublicId, file, presetName, options = {}) => {
    const uploaded = await uploadFile(file, presetName, options);

    if (oldPublicId) {
        await deleteFile(oldPublicId, resourceTypeFor(file));
    }

    return uploaded;
};

const generateUrl = (publicId, transformation = {}) => {
    return cloudinary.url(publicId, {
        secure: true,
        quality: "auto",
        fetch_format: "auto",
        ...transformation,
    });
};

module.exports = {
    PRESETS,
    uploadFile,
    uploadFiles,
    deleteFile,
    deleteFiles,
    replaceFile,
    generateUrl,
};
