const catchAsync = require("../utils/catchAsync");

const mapsService = require("../services/maps.service");

const {
    nearbyDonationsSchema,
    restaurantLocationsSchema,
    distanceMatrixSchema,
    etaSchema,
    optimizeRouteSchema,
} = require("../validations/maps.validation");

exports.getNearbyDonations = catchAsync(async (req, res) => {
    const query = nearbyDonationsSchema.parse(req.query);

    const donations = await mapsService.getNearbyDonations(query);

    res.json({ success: true, data: donations });
});

exports.getRestaurantLocations = catchAsync(async (req, res) => {
    const query = restaurantLocationsSchema.parse(req.query);

    const restaurants = await mapsService.getRestaurantLocations(query);

    res.json({ success: true, data: restaurants });
});

exports.getNgoLocations = catchAsync(async (req, res) => {
    const ngos = await mapsService.getNgoLocations();

    res.json({ success: true, data: ngos });
});

exports.getDistanceMatrix = catchAsync(async (req, res) => {
    const payload = distanceMatrixSchema.parse(req.body);

    const matrix = mapsService.getDistanceMatrix(payload);

    res.json({ success: true, data: matrix });
});

exports.getEta = catchAsync(async (req, res) => {
    const payload = etaSchema.parse(req.body);

    const eta = mapsService.getEta(payload);

    res.json({ success: true, data: eta });
});

exports.optimizeRoute = catchAsync(async (req, res) => {
    const payload = optimizeRouteSchema.parse(req.body);

    const route = mapsService.optimizeRoute(payload);

    res.json({ success: true, data: route });
});

exports.getMyRoute = catchAsync(async (req, res) => {
    const route = await mapsService.getVolunteerRoute(req.user._id);

    res.json({ success: true, data: route });
});
