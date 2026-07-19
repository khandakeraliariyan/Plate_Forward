const catchAsync = require("../utils/catchAsync");

const {
    restaurantAnalytics,
    ngoAnalytics,
    volunteerAnalytics,
    adminAnalytics,
} = require("../services/analytics");

exports.getRestaurantDashboard = catchAsync(async (req, res) => {
    const data = await restaurantAnalytics.getDashboard(req.user._id);

    res.json({ success: true, data });
});

exports.getNgoDashboard = catchAsync(async (req, res) => {
    const data = await ngoAnalytics.getDashboard(req.user._id);

    res.json({ success: true, data });
});

exports.getVolunteerDashboard = catchAsync(async (req, res) => {
    const data = await volunteerAnalytics.getDashboard(req.user._id);

    res.json({ success: true, data });
});

exports.getAdminDashboard = catchAsync(async (req, res) => {
    const data = await adminAnalytics.getDashboard();

    res.json({ success: true, data });
});

exports.getAdminHeatmap = catchAsync(async (req, res) => {
    const data = await adminAnalytics.getDonationHeatmap();

    res.json({ success: true, data });
});
