const Donation = require("../models/Donation");

const Restaurant = require("../models/Restaurant");

const ApiError = require("../utils/ApiError");

const createDonation = async (userId, payload) => {
    const restaurant = await Restaurant.findOne({
        user: userId,
    });

    if (!restaurant) {
        throw new ApiError(
            404,
            "Restaurant profile not found."
        );
    }

    const donation = await Donation.create({
        restaurant: restaurant._id,
        ...payload,
    });

    return donation;
};

const getMyDonations = async (userId) => {
    const restaurant = await Restaurant.findOne({
        user: userId,
    });

    if (!restaurant) {
        throw new ApiError(
            404,
            "Restaurant profile not found."
        );
    }

    return await Donation.find({
        restaurant: restaurant._id,
    }).sort({
        createdAt: -1,
    });
};

const getDonationById = async (id) => {
    const donation = await Donation.findById(id)
        .populate(
            "restaurant",
            "restaurantName city"
        )
        .populate(
            "reservedBy",
            "fullName email"
        )
        .populate(
            "volunteer",
            "fullName email"
        );

    if (!donation) {
        throw new ApiError(
            404,
            "Donation not found."
        );
    }

    return donation;
};

module.exports = {
    createDonation,
    getMyDonations,
    getDonationById,
};