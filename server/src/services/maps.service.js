const Donation = require("../models/Donation");
const Restaurant = require("../models/Restaurant");
const Reservation = require("../models/Reservation");
const User = require("../models/User");
const ApiError = require("../utils/ApiError");

const { haversineKm } = require("../utils/geo");
const { estimateTravelTimeMinutes } = require("../config/mapsConstants");

const DEFAULT_RADIUS_KM = 10;
const DEFAULT_LIMIT = 50;

// Lightweight map-pin data for currently pickupable donations near a point.
const getNearbyDonations = async ({ lat, lng, radius = DEFAULT_RADIUS_KM, limit = DEFAULT_LIMIT }) => {
    const donations = await Donation.aggregate([
        {
            $geoNear: {
                near: { type: "Point", coordinates: [lng, lat] },
                distanceField: "distanceMeters",
                spherical: true,
                maxDistance: radius * 1000,
                query: { status: "available" },
            },
        },
        { $limit: limit },
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
                _id: 1,
                title: 1,
                foodType: 1,
                quantity: 1,
                unit: 1,
                expiryTime: 1,
                lat: "$latitude",
                lng: "$longitude",
                distanceKm: { $round: [{ $divide: ["$distanceMeters", 1000] }, 1] },
                restaurantName: "$restaurant.restaurantName",
                restaurantId: "$restaurant._id",
            },
        },
    ]);

    return donations;
};

// Restaurant pins for a map layer, optionally scoped to a city.
const getRestaurantLocations = async ({ city } = {}) => {
    const filter = {
        latitude: { $ne: null },
        longitude: { $ne: null },
    };

    if (city) {
        filter.city = { $regex: city, $options: "i" };
    }

    return Restaurant.find(filter).select(
        "restaurantName city address latitude longitude logo isVerified"
    );
};

// NGO pins - restricted to admin callers, since exact NGO addresses are
// more sensitive than restaurant pickup points.
const getNgoLocations = async () => {
    const ngos = await User.find({
        role: "ngo",
        "ngoPreferences.latitude": { $ne: null },
        "ngoPreferences.longitude": { $ne: null },
    }).select("fullName email ngoPreferences");

    return ngos.map((ngo) => ({
        userId: ngo._id,
        fullName: ngo.fullName,
        email: ngo.email,
        address: ngo.ngoPreferences.address,
        lat: ngo.ngoPreferences.latitude,
        lng: ngo.ngoPreferences.longitude,
    }));
};

const pointToPoint = (from, to) => {
    const distanceKm = haversineKm(from.lat, from.lng, to.lat, to.lng);

    return {
        distanceKm: Math.round(distanceKm * 10) / 10,
        etaMinutes: Math.round(estimateTravelTimeMinutes(distanceKm)),
    };
};

// A Google Distance-Matrix-shaped response, computed from straight-line
// distance rather than a real routing API (see Module 17 scope note).
const getDistanceMatrix = ({ origins, destinations }) => {
    return origins.map((origin) =>
        destinations.map((destination) => pointToPoint(origin, destination))
    );
};

const getEta = ({ from, to }) => pointToPoint(from, to);

// Greedy nearest-neighbor route ordering - a practical heuristic for the
// small stop counts (a handful of pickups/drop-offs) volunteers actually
// deal with, not a true TSP solver.
const optimizeRoute = ({ start, stops }) => {
    const remaining = [...stops];
    const orderedStops = [];

    let current = start;
    let totalDistanceKm = 0;
    let totalEtaMinutes = 0;

    while (remaining.length) {
        let nearestIndex = 0;
        let nearestDistance = Infinity;

        remaining.forEach((stop, index) => {
            const distance = haversineKm(current.lat, current.lng, stop.lat, stop.lng);

            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearestIndex = index;
            }
        });

        const [next] = remaining.splice(nearestIndex, 1);

        const leg = pointToPoint(current, next);

        totalDistanceKm += leg.distanceKm;
        totalEtaMinutes += leg.etaMinutes;

        orderedStops.push({ ...next, legDistanceKm: leg.distanceKm, legEtaMinutes: leg.etaMinutes });

        current = next;
    }

    return {
        orderedStops,
        totalDistanceKm: Math.round(totalDistanceKm * 10) / 10,
        totalEtaMinutes: Math.round(totalEtaMinutes),
    };
};

// Builds a volunteer's current delivery route from their active
// reservations: pickup (restaurant/donation location) then drop-off (NGO
// location), ordered by the nearest-neighbor heuristic from their last
// known socket-reported location, falling back to the first pickup point.
const getVolunteerRoute = async (volunteerId) => {
    const reservations = await Reservation.find({
        volunteer: volunteerId,
        status: { $in: ["accepted", "picked_up"] },
    })
        .populate("donation", "title latitude longitude")
        .populate("ngo", "fullName ngoPreferences")
        .populate("restaurant", "restaurantName latitude longitude");

    if (!reservations.length) {
        return { orderedStops: [], totalDistanceKm: 0, totalEtaMinutes: 0 };
    }

    const stops = [];

    for (const reservation of reservations) {
        if (reservation.status === "accepted") {
            const lat = reservation.donation?.latitude ?? reservation.restaurant?.latitude;
            const lng = reservation.donation?.longitude ?? reservation.restaurant?.longitude;

            if (lat != null && lng != null) {
                stops.push({
                    type: "pickup",
                    reservationId: reservation._id,
                    label: reservation.restaurant?.restaurantName,
                    lat,
                    lng,
                });
            }
        }

        if (reservation.status === "picked_up") {
            const lat = reservation.ngo?.ngoPreferences?.latitude;
            const lng = reservation.ngo?.ngoPreferences?.longitude;

            if (lat != null && lng != null) {
                stops.push({
                    type: "dropoff",
                    reservationId: reservation._id,
                    label: reservation.ngo?.fullName,
                    lat,
                    lng,
                });
            }
        }
    }

    if (!stops.length) {
        throw new ApiError(
            400,
            "No location data is available yet for your active deliveries."
        );
    }

    // There's no persisted "current volunteer location" to anchor the route
    // to (live GPS is transient, socket-only - see Module 11), so the first
    // stop itself is used as the starting reference, with a zero leg cost,
    // and the remaining stops are nearest-neighbor ordered from there.
    const [first, ...rest] = stops;

    const { orderedStops, totalDistanceKm, totalEtaMinutes } = optimizeRoute({
        start: first,
        stops: rest,
    });

    return {
        orderedStops: [{ ...first, legDistanceKm: 0, legEtaMinutes: 0 }, ...orderedStops],
        totalDistanceKm,
        totalEtaMinutes,
    };
};

module.exports = {
    getNearbyDonations,
    getRestaurantLocations,
    getNgoLocations,
    getDistanceMatrix,
    getEta,
    optimizeRoute,
    getVolunteerRoute,
};
