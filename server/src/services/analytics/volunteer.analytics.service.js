const Reservation = require("../../models/Reservation");

const { haversineKm } = require("../../utils/geo");

const DELIVERED_STATUSES = ["delivered", "completed"];

const getDashboard = async (volunteerId) => {
    const reservations = await Reservation.find({ volunteer: volunteerId })
        .populate("donation", "latitude longitude")
        .populate("ngo", "ngoPreferences")
        .select("status pickedUpAt deliveredAt rating donation ngo");

    const totalAssigned = reservations.length;

    const delivered = reservations.filter((r) => DELIVERED_STATUSES.includes(r.status));

    const distances = delivered
        .map((r) => {
            const donationLat = r.donation?.latitude;
            const donationLng = r.donation?.longitude;
            const ngoLat = r.ngo?.ngoPreferences?.latitude;
            const ngoLng = r.ngo?.ngoPreferences?.longitude;

            if (
                donationLat == null ||
                donationLng == null ||
                ngoLat == null ||
                ngoLng == null
            ) {
                return null;
            }

            return haversineKm(donationLat, donationLng, ngoLat, ngoLng);
        })
        .filter((d) => d !== null);

    const deliveryTimesMinutes = delivered
        .filter((r) => r.pickedUpAt && r.deliveredAt)
        .map((r) => (r.deliveredAt.getTime() - r.pickedUpAt.getTime()) / 60_000);

    const ratings = reservations
        .map((r) => r.rating?.score)
        .filter((score) => typeof score === "number");

    const totalDistanceKm = distances.reduce((sum, d) => sum + d, 0);
    const avgDistanceKm = distances.length ? totalDistanceKm / distances.length : null;

    const avgDeliveryTimeMinutes = deliveryTimesMinutes.length
        ? deliveryTimesMinutes.reduce((sum, t) => sum + t, 0) / deliveryTimesMinutes.length
        : null;

    const completionRate = totalAssigned ? delivered.length / totalAssigned : null;

    const avgRating = ratings.length
        ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length
        : null;

    return {
        deliveries: delivered.length,

        distance: {
            totalKm: Math.round(totalDistanceKm * 10) / 10,
            averageKm: avgDistanceKm !== null ? Math.round(avgDistanceKm * 10) / 10 : null,
        },

        averageTimeMinutes:
            avgDeliveryTimeMinutes !== null ? Math.round(avgDeliveryTimeMinutes) : null,

        completionRate: completionRate !== null ? Math.round(completionRate * 100) : null,

        rating: {
            average: avgRating !== null ? Math.round(avgRating * 10) / 10 : null,
            count: ratings.length,
        },
    };
};

module.exports = { getDashboard };
