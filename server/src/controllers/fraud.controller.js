const catchAsync = require("../utils/catchAsync");
const fraudDetectionService = require("../services/fraudDetection.service");

exports.getFraudReport = catchAsync(async (req, res) => {
    const report = await fraudDetectionService.getFraudReport();

    res.json({
        success: true,
        data: report,
    });
});
