const catchAsync = require("../utils/catchAsync");

const { createRestaurantSchema } = require("../validations/restaurant.validation");

const ApiError = require("../utils/ApiError");

const {
    createRestaurant,
    getMyRestaurant,
    uploadLogo,
    uploadCover,
    addGalleryImages,
    removeGalleryImage,
} = require("../services/restaurant.service");

exports.createRestaurant = catchAsync(
    async (req, res) => {
        const payload =
            createRestaurantSchema.parse(req.body);

        const restaurant = await createRestaurant(
            req.user._id,
            payload
        );

        res.status(201).json({
            success: true,
            message: "Restaurant profile created successfully.",
            data: restaurant,
        });
    }
);

exports.getMyRestaurant = catchAsync(
    async (req, res) => {
        const restaurant = await getMyRestaurant(
            req.user._id
        );

        res.json({
            success: true,
            data: restaurant,
        });
    }
);

exports.uploadLogo = catchAsync(async (req, res) => {
    if (!req.file) {
        throw new ApiError(400, "Logo image is required.");
    }

    const restaurant = await uploadLogo(req.user._id, req.file);

    res.json({
        success: true,
        message: "Logo uploaded successfully.",
        data: restaurant,
    });
});

exports.uploadCover = catchAsync(async (req, res) => {
    if (!req.file) {
        throw new ApiError(400, "Cover image is required.");
    }

    const restaurant = await uploadCover(req.user._id, req.file);

    res.json({
        success: true,
        message: "Cover image uploaded successfully.",
        data: restaurant,
    });
});

exports.addGalleryImages = catchAsync(async (req, res) => {
    if (!req.files || !req.files.length) {
        throw new ApiError(400, "At least one image is required.");
    }

    const restaurant = await addGalleryImages(req.user._id, req.files);

    res.status(201).json({
        success: true,
        message: "Gallery images uploaded successfully.",
        data: restaurant,
    });
});

exports.removeGalleryImage = catchAsync(async (req, res) => {
    const restaurant = await removeGalleryImage(req.user._id, req.params.imageId);

    res.json({
        success: true,
        message: "Gallery image removed successfully.",
        data: restaurant,
    });
});
