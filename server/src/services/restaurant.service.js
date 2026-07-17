const Restaurant = require("../models/Restaurant");
const ApiError = require("../utils/ApiError");

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

module.exports = {
    createRestaurant,
    getMyRestaurant,
};