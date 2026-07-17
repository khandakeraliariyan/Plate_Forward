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

const getAllDonations = async (query) => {
    const {
        page = 1,
        limit = 10,
        search,
        city,
        foodType,
        status = "available",
        sort = "newest",
    } = query;

    const filter = {};

    if (status) {
        filter.status = status;
    }

    if (city) {
        filter.city = {
            $regex: city,
            $options: "i",
        };
    }

    if (foodType) {
        filter.foodType = foodType;
    }

    if (search) {
        filter.$or = [
            {
                title: {
                    $regex: search,
                    $options: "i",
                },
            },
            {
                description: {
                    $regex: search,
                    $options: "i",
                },
            },
        ];
    }

    let sortOption = {};

    switch (sort) {
        case "oldest":
            sortOption = {
                createdAt: 1,
            };
            break;

        case "expiry":
            sortOption = {
                expiryTime: 1,
            };
            break;

        case "quantity":
            sortOption = {
                quantity: -1,
            };
            break;

        default:
            sortOption = {
                createdAt: -1,
            };
    }

    const currentPage = Math.max(
        parseInt(page, 10) || 1,
        1
    );

    const pageSize = Math.min(
        Math.max(parseInt(limit, 10) || 10, 1),
        100
    );

    const skip = (currentPage - 1) * pageSize;

    const [donations, total] = await Promise.all([
        Donation.find(filter)
            .populate({
                path: "restaurant",
                select:
                    "restaurantName city logo address isVerified",
            })
            .sort(sortOption)
            .skip(skip)
            .limit(pageSize),

        Donation.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(
        total / pageSize
    );

    return {
        donations,

        pagination: {
            total,

            page: currentPage,

            limit: pageSize,

            totalPages,

            hasNextPage:
                currentPage < totalPages,

            hasPrevPage:
                currentPage > 1,
        },
    };
};

module.exports = {
    createDonation,
    getMyDonations,
    getDonationById,
    updateDonation,
    deleteDonation,
    getAllDonations
};