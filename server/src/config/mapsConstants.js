// Assumed average travel speed (km/h) used to turn straight-line distance
// into an estimated travel time, since there is no Google Maps/Directions
// API wired up (no real road routing, traffic, etc.) - see Module 17.
// A conservative urban delivery estimate; tune as needed.
const AVERAGE_SPEED_KMH = 25;

// Straight-line distance tends to undercount real road distance. This
// factor roughly compensates when estimating travel time from haversine
// distance (a common rule-of-thumb "detour index" for urban areas).
const ROAD_DISTANCE_FACTOR = 1.3;

const estimateTravelTimeMinutes = (straightLineKm, speedKmh = AVERAGE_SPEED_KMH) => {
    const roadKm = straightLineKm * ROAD_DISTANCE_FACTOR;

    return (roadKm / speedKmh) * 60;
};

module.exports = {
    AVERAGE_SPEED_KMH,
    ROAD_DISTANCE_FACTOR,
    estimateTravelTimeMinutes,
};
