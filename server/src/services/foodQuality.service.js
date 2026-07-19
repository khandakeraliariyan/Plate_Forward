const ApiError = require("../utils/ApiError");
const Donation = require("../models/Donation");
const { getShelfLifeHours } = require("../config/shelfLifeConstants");

const clamp01 = (value) => Math.min(1, Math.max(0, value));

// Heuristic-only assessment (Module 16) - there is no image classification
// here. Freshness/risk are estimated purely from metadata already stored on
// the donation (food category, time since posted, time until the
// restaurant's stated expiry), using the shelf-life table above.
const assessDonation = (donation) => {
    const now = Date.now();

    const postedAt = donation.createdAt.getTime();
    const expiryAt = donation.expiryTime.getTime();

    const hoursSincePosted = (now - postedAt) / 3_600_000;
    const hoursUntilExpiry = (expiryAt - now) / 3_600_000;

    const shelfLifeHours = getShelfLifeHours(donation.foodType);

    const freshnessRatio = clamp01(1 - hoursSincePosted / shelfLifeHours);

    const expiryUrgency = hoursUntilExpiry <= 0 ? 1 : clamp01(1 - hoursUntilExpiry / shelfLifeHours);

    const riskScore = Math.round(
        clamp01(0.6 * (1 - freshnessRatio) + 0.4 * expiryUrgency) * 100
    );

    let freshnessLabel;

    if (hoursUntilExpiry <= 0) {
        freshnessLabel = "expired";
    } else if (riskScore < 25) {
        freshnessLabel = "fresh";
    } else if (riskScore < 50) {
        freshnessLabel = "good";
    } else if (riskScore < 75) {
        freshnessLabel = "use soon";
    } else {
        freshnessLabel = "high risk";
    }

    let recommendation;

    if (hoursUntilExpiry <= 0) {
        recommendation = "Do not distribute - past the stated expiry time.";
    } else if (riskScore >= 75) {
        recommendation = "Prioritize immediate pickup and distribution.";
    } else if (riskScore >= 50) {
        recommendation = "Pickup within the next few hours is recommended.";
    } else {
        recommendation = "Standard handling - no urgent action needed.";
    }

    return {
        freshnessScore: Math.round(freshnessRatio * 100),
        freshnessLabel,
        riskScore,
        estimatedShelfLifeRemainingHours: Math.max(
            0,
            Math.round(shelfLifeHours - hoursSincePosted)
        ),
        hoursUntilExpiry: Math.round(hoursUntilExpiry * 10) / 10,
        recommendation,
        method: "heuristic-metadata",
    };
};

const assessDonationById = async (donationId) => {
    const donation = await Donation.findById(donationId).select(
        "foodType createdAt expiryTime"
    );

    if (!donation) {
        throw new ApiError(404, "Donation not found.");
    }

    return assessDonation(donation);
};

module.exports = { assessDonation, assessDonationById };
