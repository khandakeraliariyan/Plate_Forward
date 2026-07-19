const Restaurant = require("../models/Restaurant");
const ApiError = require("../utils/ApiError");
const storageService = require("./storage.service");

const createRestaurant = async (userId, payload) => {
    const exists = await Restaurant.findOne({
        user: userId,
    });

    if (exists) {
        throw new ApiError(
            400,
            "Restaurant profile already exists."
        );
    }

    const restaurant = await Restaurant.create({
        user: userId,
        ...payload,
    });

    return restaurant;
};

const getMyRestaurant = async (userId) => {
    return await Restaurant.findOne({
        user: userId,
    }).populate("user", "fullName email avatar");
};

const findOwnedRestaurant = async (userId) => {
    const restaurant = await Restaurant.findOne({
        user: userId,
    });

    if (!restaurant) {
        throw new ApiError(404, "Restaurant profile not found.");
    }

    return restaurant;
};

const updateRestaurant = async (userId, payload) => {
    const restaurant = await findOwnedRestaurant(userId);

    Object.assign(restaurant, payload);

    await restaurant.save();

    return restaurant;
};

const uploadLogo = async (userId, file) => {
    const restaurant = await findOwnedRestaurant(userId);

    const uploaded = await storageService.replaceFile(
        restaurant.logoPublicId,
        file,
        "RESTAURANT_LOGO"
    );

    restaurant.logo = uploaded.url;
    restaurant.logoPublicId = uploaded.publicId;

    await restaurant.save();

    return restaurant;
};

const uploadCover = async (userId, file) => {
    const restaurant = await findOwnedRestaurant(userId);

    const uploaded = await storageService.replaceFile(
        restaurant.coverImagePublicId,
        file,
        "RESTAURANT_COVER"
    );

    restaurant.coverImage = uploaded.url;
    restaurant.coverImagePublicId = uploaded.publicId;

    await restaurant.save();

    return restaurant;
};

const MAX_GALLERY_IMAGES = 6;

const addGalleryImages = async (userId, files) => {
    const restaurant = await findOwnedRestaurant(userId);

    if (restaurant.gallery.length + files.length > MAX_GALLERY_IMAGES) {
        throw new ApiError(
            400,
            `Gallery cannot have more than ${MAX_GALLERY_IMAGES} images.`
        );
    }

    const uploaded = await storageService.uploadFiles(files, "RESTAURANT_GALLERY");

    restaurant.gallery.push(
        ...uploaded.map(({ url, publicId }) => ({ url, publicId }))
    );

    await restaurant.save();

    return restaurant;
};

const removeGalleryImage = async (userId, imageId) => {
    const restaurant = await findOwnedRestaurant(userId);

    const image = restaurant.gallery.id(imageId);

    if (!image) {
        throw new ApiError(404, "Gallery image not found.");
    }

    await storageService.deleteFile(image.publicId);

    restaurant.gallery.pull(imageId);

    await restaurant.save();

    return restaurant;
};

module.exports = {
    createRestaurant,
    getMyRestaurant,
    updateRestaurant,
    uploadLogo,
    uploadCover,
    addGalleryImages,
    removeGalleryImage,
};