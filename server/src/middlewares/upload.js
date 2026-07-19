const multer = require("multer");

const ApiError = require("../utils/ApiError");

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const ALLOWED_DOCUMENT_TYPES = [...ALLOWED_IMAGE_TYPES, "application/pdf"];

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024; // 10MB

const storage = multer.memoryStorage();

const makeFileFilter = (allowedTypes) => (req, file, cb) => {
    if (!allowedTypes.includes(file.mimetype)) {
        return cb(
            new ApiError(
                400,
                `Unsupported file type "${file.mimetype}". Allowed: ${allowedTypes.join(", ")}`
            )
        );
    }

    cb(null, true);
};

const imageUpload = multer({
    storage,
    limits: { fileSize: MAX_IMAGE_SIZE },
    fileFilter: makeFileFilter(ALLOWED_IMAGE_TYPES),
});

const documentUpload = multer({
    storage,
    limits: { fileSize: MAX_DOCUMENT_SIZE },
    fileFilter: makeFileFilter(ALLOWED_DOCUMENT_TYPES),
});

// Normalizes Multer's own errors (file too large, unexpected field, etc.)
// into the app's ApiError shape so errorHandler formats them consistently.
const handleUploadErrors = (uploadMiddleware) => {
    return (req, res, next) => {
        uploadMiddleware(req, res, (err) => {
            if (!err) {
                return next();
            }

            if (err instanceof multer.MulterError) {
                return next(new ApiError(400, `Upload error: ${err.message}`));
            }

            next(err);
        });
    };
};

module.exports = {
    uploadImageSingle: (field) => handleUploadErrors(imageUpload.single(field)),
    uploadImageArray: (field, maxCount) =>
        handleUploadErrors(imageUpload.array(field, maxCount)),
    uploadImageFields: (fields) => handleUploadErrors(imageUpload.fields(fields)),
    uploadDocumentSingle: (field) => handleUploadErrors(documentUpload.single(field)),
};
