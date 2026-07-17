const Donation = require("../models/Donation");
const Restaurant = require("../models/Restaurant");
const ApiError = require("../utils/ApiError");

const createDonation = async (userId, payload) => {
    const restaurant = await Restaurant.findOne({
        user: userId,
    });

    if (!restaurant) {
        throw new ApiError(404, "Restaurant profile not found.");
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
        throw new ApiError(404, "Restaurant profile not found.");
    }

    return await Donation.find({
        restaurant: restaurant._id,
    }).sort({
        createdAt: -1,
    });
};

const getDonationById = async (id) => {
    const donation = await Donation.findById(id)
        .populate("restaurant", "restaurantName city")
        .populate("reservedBy", "fullName email")
        .populate("volunteer", "fullName email");

    if (!donation) {
        throw new ApiError(404, "Donation not found.");
    }

    return donation;
};

const updateDonation = async (userId, donationId, payload) => {
    const restaurant = await Restaurant.findOne({
        user: userId,
    });

    if (!restaurant) {
        throw new ApiError(404, "Restaurant profile not found.");
    }

    const donation = await Donation.findOne({
        _id: donationId,
        restaurant: restaurant._id,
    });

    if (!donation) {
        throw new ApiError(
            404,
            "Donation not found."
        );
    }

    if (
        donation.status !== "available"
    ) {
        throw new ApiError(
            400,
            "Only available donations can be updated."
        );
    }

    Object.assign(donation, payload);

    await donation.save();

    return donation;
};

const deleteDonation = async (userId, donationId) => {
    const restaurant = await Restaurant.findOne({
        user: userId,
    });

    if (!restaurant) {
        throw new ApiError(404, "Restaurant profile not found.");
    }

    const donation = await Donation.findOne({
        _id: donationId,
        restaurant: restaurant._id,
    });

    if (!donation) {
        throw new ApiError(
            404,
            "Donation not found."
        );
    }

    if (
        donation.status !== "available"
    ) {
        throw new ApiError(
            400,
            "Donation cannot be deleted after reservation."
        );
    }

    await Donation.findByIdAndDelete(
        donationId
    );

    return true;
};

module.exports = {
    createDonation,
    getMyDonations,
    getDonationById,
    updateDonation,
    deleteDonation,
};