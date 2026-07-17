const catchAsync = require("../utils/catchAsync");

const { createDonationSchema } = require("../validations/donation.validation");

const donationService = require("../services/donation.service");

exports.createDonation = catchAsync(async (req, res) => {
    const payload = createDonationSchema.parse(req.body);

    const donation = await donationService.createDonation(
        req.user._id,
        payload
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