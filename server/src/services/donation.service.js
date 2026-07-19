const Donation = require("../models/Donation");
const Restaurant = require("../models/Restaurant");
const User = require("../models/User");
const notificationService = require("./notification.service");
const emailService = require("./email.service");
const donationExpiredTemplate = require("../templates/donationExpired.template");
const ApiError = require("../utils/ApiError");

const { emitToRoom } = require("../socket");
const { restaurantRoom, donationRoom, roleRoom } = require("../socket/rooms");
const {
    DONATION_CREATED,
    DONATION_UPDATED,
    DONATION_DELETED,
    DONATION_EXPIRED,
} = require("../socket/events");
const { emitAdminStats, emitActivityFeed } = require("../socket/adminDashboard");

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

    const admins = await User.find({
        role: "admin",
    }).select("_id");

    for (const admin of admins) {
        await notificationService.createNotification({
            user: admin._id,
            title: "New Donation",
            message: "A restaurant has published a new food donation.",
            type: "DONATION_CREATED",
            priority: "low",
            data: {
                donation: donation._id,
                restaurant: donation.restaurant,
            },
        });
    }

    emitToRoom(roleRoom("ngo"), DONATION_CREATED, donation);
    emitToRoom(restaurantRoom(restaurant._id.toString()), DONATION_CREATED, donation);

    await emitAdminStats();

    emitActivityFeed({
        type: DONATION_CREATED,
        message: `${restaurant.restaurantName} published a new donation.`,
        data: { donationId: donation._id },
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

    emitToRoom(donationRoom(donation._id.toString()), DONATION_UPDATED, donation);
    emitToRoom(roleRoom("ngo"), DONATION_UPDATED, donation);

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

    emitToRoom(donationRoom(donationId.toString()), DONATION_DELETED, {
        donationId,
    });
    emitToRoom(roleRoom("ngo"), DONATION_DELETED, { donationId });

    await emitAdminStats();

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

const expireDonations = async () => {
    const expiredDonations = await Donation.find({
        status: "available",
        expiryTime: {
            $lte: new Date(),
        },
    });

    if (!expiredDonations.length) {
        return { count: 0 };
    }

    for (const donation of expiredDonations) {
        donation.status = "expired";

        await donation.save();

        const restaurant = await Restaurant.findById(
            donation.restaurant
        ).populate("user");

        if (!restaurant?.user) {
            continue;
        }

        await notificationService.createNotification({
            user: restaurant.user._id,
            title: "Donation Expired",
            message: "One of your donations expired before it was reserved.",
            type: "DONATION_EXPIRED",
            priority: "medium",
            data: {
                donation: donation._id,
                restaurant: restaurant._id,
            },
        });

        await emailService.sendTemplateEmail({
            to: restaurant.user.email,
            subject: "Donation Expired",
            template: donationExpiredTemplate,
            data: {},
        });

        emitToRoom(donationRoom(donation._id.toString()), DONATION_EXPIRED, {
            donationId: donation._id,
        });

        emitToRoom(
            restaurantRoom(restaurant._id.toString()),
            DONATION_EXPIRED,
            { donationId: donation._id }
        );

        emitActivityFeed({
            type: DONATION_EXPIRED,
            message: `A donation from ${restaurant.restaurantName} expired.`,
            data: { donationId: donation._id },
        });
    }

    await emitAdminStats();

    return { count: expiredDonations.length };
};

module.exports = {
    createDonation,
    getMyDonations,
    getDonationById,
    expireDonations,
    updateDonation,
    deleteDonation,
    getAllDonations
};