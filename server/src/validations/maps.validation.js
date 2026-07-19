const { z } = require("zod");

const nearbyDonationsSchema = z.object({
    lat: z.coerce.number().min(-90).max(90),

    lng: z.coerce.number().min(-180).max(180),

    radius: z.coerce.number().positive().max(100).optional(),

    limit: z.coerce.number().min(1).max(100).optional(),
});

const restaurantLocationsSchema = z.object({
    city: z.string().optional(),
});

const point = z.object({
    lat: z.coerce.number().min(-90).max(90),
    lng: z.coerce.number().min(-180).max(180),
});

const distanceMatrixSchema = z.object({
    origins: z.array(point).min(1).max(25),

    destinations: z.array(point).min(1).max(25),
});

const etaSchema = z.object({
    from: point,
    to: point,
});

const namedPoint = point.extend({
    label: z.string().optional(),
});

const optimizeRouteSchema = z.object({
    start: point,

    stops: z.array(namedPoint).min(1).max(25),
});

module.exports = {
    nearbyDonationsSchema,
    restaurantLocationsSchema,
    distanceMatrixSchema,
    etaSchema,
    optimizeRouteSchema,
};
