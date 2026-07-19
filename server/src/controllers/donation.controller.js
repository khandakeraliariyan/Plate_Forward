const catchAsync = require("../utils/catchAsync");

const donationService = require("../services/donation.service");
const foodQualityService = require("../services/foodQuality.service");
const ApiError = require("../utils/ApiError");

const { createDonationSchema, donationQuerySchema } = require("../validations/donation.validation");

exports.createDonation = catchAsync(async (req, res) => {
    const payload = createDonationSchema.parse(req.body);

    const donation = await donationService.createDonation(
        req.user._id,
        payload,
        req.files || []
    );

    res.status(201).json({
        success: true,
        message: "Donation created successfully.",
        data: donation,
    });
});

exports.getMyDonations = catchAsync(async (req, res) => {
    const donations = await donationService.getMyDonations(
        req.user._id
    );

    res.status(200).json({
        success: true,
        count: donations.length,
        data: donations,
    });
});

exports.getDonationById = catchAsync(async (req, res) => {
    const donation = await donationService.getDonationById(
        req.params.id
    );

    res.status(200).json({
        success: true,
        data: donation,
    });
});

exports.updateDonation = catchAsync(async (req, res) => {
    const donation = await donationService.updateDonation(
        req.user._id,
        req.params.id,
        req.body
    );

    res.status(200).json({
        success: true,
        message: "Donation updated successfully.",
        data: donation,
    });
});

exports.deleteDonation = catchAsync(async (req, res) => {
    await donationService.deleteDonation(
        req.user._id,
        req.params.id
    );

    res.status(200).json({
        success: true,
        message: "Donation deleted successfully.",
    });
});

exports.addDonationImages = catchAsync(async (req, res) => {
    if (!req.files || !req.files.length) {
        throw new ApiError(400, "At least one image is required.");
    }

    const donation = await donationService.addDonationImages(
        req.user._id,
        req.params.id,
        req.files
    );

    res.status(201).json({
        success: true,
        message: "Images uploaded successfully.",
        data: donation,
    });
});

exports.removeDonationImage = catchAsync(async (req, res) => {
    const donation = await donationService.removeDonationImage(
        req.user._id,
        req.params.id,
        req.params.imageId
    );

    res.status(200).json({
        success: true,
        message: "Image removed successfully.",
        data: donation,
    });
});

exports.getDonationQuality = catchAsync(async (req, res) => {
    const assessment = await foodQualityService.assessDonationById(req.params.id);

    res.status(200).json({
        success: true,
        data: assessment,
    });
});

exports.getAllDonations = catchAsync(
    async (req, res) => {
        const query = donationQuerySchema.parse(req.query);

        const result = await donationService.getAllDonations(
            query
        );

        res.status(200).json({
            success: true,

            message:
                "Donations fetched successfully.",

            pagination:
                result.pagination,

            data: result.donations,
        });
    }
);