const mongoose = require("mongoose");

const Donation = require("../models/Donation");
const Restaurant = require("../models/Restaurant");
const User = require("../models/User");
const notificationService = require("./notification.service");
const emailService = require("./email.service");
const donationExpiredTemplate = require("../templates/donationExpired.template");
const ApiError = require("../utils/ApiError");
const storageService = require("./storage.service");

const MAX_DONATION_IMAGES = 5;

const { emitToRoom } = require("../socket");
const { restaurantRoom, donationRoom, roleRoom } = require("../socket/rooms");
const {
    DONATION_CREATED,
    DONATION_UPDATED,
    DONATION_DELETED,
    DONATION_EXPIRED,
} = require("../socket/events");
const { emitAdminStats, emitActivityFeed } = require("../socket/adminDashboard");

const createDonation = async (userId, payload, files = []) => {
    const restaurant = await Restaurant.findOne({
        user: userId,
    });

    if (!restaurant) {
        throw new ApiError(404, "Restaurant profile not found.");
    }

    if (files.length > MAX_DONATION_IMAGES) {
        throw new ApiError(
            400,
            `A donation cannot have more than ${MAX_DONATION_IMAGES} images.`
        );
    }

    const uploadedImages = files.length
        ? await storageService.uploadFiles(files, "DONATION_IMAGE")
        : [];

    const donation = await Donation.create({
        restaurant: restaurant._id,
        ...payload,
        images: uploadedImages.map(({ url, publicId }) => ({ url, publicId })),
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

    await storageService.deleteFiles(
        donation.images.map((image) => image.publicId)
    );

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

const addDonationImages = async (userId, donationId, files) => {
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
        throw new ApiError(404, "Donation not found.");
    }

    if (donation.images.length + files.length > MAX_DONATION_IMAGES) {
        throw new ApiError(
            400,
            `A donation cannot have more than ${MAX_DONATION_IMAGES} images.`
        );
    }

    const uploaded = await storageService.uploadFiles(files, "DONATION_IMAGE");

    donation.images.push(
        ...uploaded.map(({ url, publicId }) => ({ url, publicId }))
    );

    await donation.save();

    emitToRoom(donationRoom(donation._id.toString()), DONATION_UPDATED, donation);

    return donation;
};

const removeDonationImage = async (userId, donationId, imageId) => {
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
        throw new ApiError(404, "Donation not found.");
    }

    const image = donation.images.id(imageId);

    if (!image) {
        throw new ApiError(404, "Image not found.");
    }

    await storageService.deleteFile(image.publicId);

    donation.images.pull(imageId);

    await donation.save();

    emitToRoom(donationRoom(donation._id.toString()), DONATION_UPDATED, donation);

    return donation;
};

const buildSortStage = (sort, hasGeo, hasSearch) => {
    switch (sort) {
        case "oldest":
            return { createdAt: 1 };

        case "expiry":
            return { expiryTime: 1 };

        case "quantity":
            return { quantity: -1 };

        case "distance":
            return hasGeo ? { distance: 1 } : { createdAt: -1 };

        case "relevance":
            return hasSearch ? { score: -1 } : { createdAt: -1 };

        default:
            return { createdAt: -1 };
    }
};

const getAllDonations = async (query) => {
    const {
        page = 1,
        limit = 10,
        search,
        city,
        foodType,
        status = "available",
        restaurant,
        lat,
        lng,
        radius,
        minQuantity,
        maxQuantity,
        expiryBefore,
        expiryAfter,
        availableNow,
        sort = "newest",
    } = query;

    const currentPage = Math.max(parseInt(page, 10) || 1, 1);

    const pageSize = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);

    const skip = (currentPage - 1) * pageSize;

    const hasGeo = lat !== undefined && lng !== undefined;

    // Non-geospatial filters shared by every code path. $geoNear requires
    // these to live inside its own `query` option rather than a separate
    // $match stage, since $geoNear must be the pipeline's first stage.
    const matchFilter = {};

    if (status) {
        matchFilter.status = status;
    }

    if (city) {
        matchFilter.city = {
            $regex: city,
            $options: "i",
        };
    }

    if (foodType) {
        matchFilter.foodType = foodType;
    }

    if (restaurant) {
        matchFilter.restaurant = new mongoose.Types.ObjectId(restaurant);
    }

    if (minQuantity !== undefined || maxQuantity !== undefined) {
        matchFilter.quantity = {};

        if (minQuantity !== undefined) {
            matchFilter.quantity.$gte = minQuantity;
        }

        if (maxQuantity !== undefined) {
            matchFilter.quantity.$lte = maxQuantity;
        }
    }

    if (expiryBefore || expiryAfter) {
        matchFilter.expiryTime = {};

        if (expiryAfter) {
            matchFilter.expiryTime.$gte = new Date(expiryAfter);
        }

        if (expiryBefore) {
            matchFilter.expiryTime.$lte = new Date(expiryBefore);
        }
    }

    if (availableNow) {
        const now = new Date();

        matchFilter.status = "available";
        matchFilter.pickupStartTime = { $lte: now };
        matchFilter.pickupEndTime = { $gte: now };
    }

    const pipeline = [];

    // $text and $geoNear each require being the pipeline's first stage, so
    // a text search combined with a geo radius falls back to a case
    // insensitive regex match instead of full-text relevance scoring.
    if (hasGeo) {
        const geoNearStage = {
            near: {
                type: "Point",
                coordinates: [lng, lat],
            },
            distanceField: "distance",
            spherical: true,
            query: matchFilter,
        };

        if (radius) {
            geoNearStage.maxDistance = radius * 1000; // km -> meters
        }

        pipeline.push({ $geoNear: geoNearStage });

        if (search) {
            pipeline.push({
                $match: {
                    $or: [
                        { title: { $regex: search, $options: "i" } },
                        { description: { $regex: search, $options: "i" } },
                    ],
                },
            });
        }
    } else if (search) {
        pipeline.push({
            $match: {
                ...matchFilter,
                $text: { $search: search },
            },
        });

        pipeline.push({
            $addFields: { score: { $meta: "textScore" } },
        });
    } else {
        pipeline.push({ $match: matchFilter });
    }

    pipeline.push(
        {
            $lookup: {
                from: "restaurants",
                localField: "restaurant",
                foreignField: "_id",
                as: "restaurant",
            },
        },
        { $unwind: "$restaurant" },
        {
            $project: {
                title: 1,
                description: 1,
                foodType: 1,
                quantity: 1,
                unit: 1,
                expiryTime: 1,
                pickupStartTime: 1,
                pickupEndTime: 1,
                images: 1,
                pickupAddress: 1,
                city: 1,
                latitude: 1,
                longitude: 1,
                status: 1,
                reservedBy: 1,
                volunteer: 1,
                completedAt: 1,
                notes: 1,
                createdAt: 1,
                updatedAt: 1,
                distance: 1,
                score: 1,
                restaurant: {
                    _id: "$restaurant._id",
                    restaurantName: "$restaurant.restaurantName",
                    city: "$restaurant.city",
                    logo: "$restaurant.logo",
                    address: "$restaurant.address",
                    isVerified: "$restaurant.isVerified",
                },
            },
        },
        {
            $facet: {
                data: [
                    { $sort: buildSortStage(sort, hasGeo, !!search) },
                    { $skip: skip },
                    { $limit: pageSize },
                ],
                totalCount: [{ $count: "count" }],
            },
        }
    );

    const [result] = await Donation.aggregate(pipeline);

    const donations = result.data;

    const total = result.totalCount[0]?.count || 0;

    const totalPages = Math.ceil(total / pageSize);

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
    addDonationImages,
    removeDonationImage,
    getAllDonations
};