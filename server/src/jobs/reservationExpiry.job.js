const cron = require("node-cron");

const Donation = require("../models/Donation");
const Reservation = require("../models/Reservation");
const Restaurant = require("../models/Restaurant");

const notificationService = require("../services/notification.service");

const { emitToRoom } = require("../socket");
const { restaurantRoom, reservationRoom, donationRoom } = require("../socket/rooms");
const { RESERVATION_EXPIRED, DONATION_UPDATED } = require("../socket/events");
const { emitAdminStats, emitActivityFeed } = require("../socket/adminDashboard");

module.exports = () => {
    cron.schedule("* * * * *", async () => {
        try {
            const reservations =
                await Reservation.find({
                    status: "reserved",
                    expiresAt: {
                        $lte: new Date(),
                    },
                });

            if (!reservations.length) {
                return;
            }

            for (const reservation of reservations) {
                reservation.status =
                    "expired";

                await reservation.save();

                await Donation.findByIdAndUpdate(
                    reservation.donation,
                    {
                        status:
                            "available",
                    }
                );

                await notificationService.createNotification({
                    user: reservation.ngo,
                    title:
                        "Reservation Expired",
                    message:
                        "Your reservation expired because it was not accepted in time.",
                    type:
                        "RESERVATION_EXPIRED",
                    priority:
                        "high",
                    data: {
                        reservation:
                            reservation._id,
                    },
                });

                const restaurant =
                    await Restaurant.findById(
                        reservation.restaurant
                    ).populate("user");

                if (
                    restaurant?.user
                ) {
                    await notificationService.createNotification(
                        {
                            user: restaurant.user._id,
                            title:
                                "Reservation Expired",
                            message:
                                "A reservation has expired. The donation is available again.",
                            type:
                                "RESERVATION_EXPIRED",
                            priority:
                                "medium",
                            data: {
                                reservation:
                                    reservation._id,
                            },
                        }
                    );
                }

                emitToRoom(
                    reservationRoom(reservation._id.toString()),
                    RESERVATION_EXPIRED,
                    reservation
                );

                if (restaurant) {
                    emitToRoom(
                        restaurantRoom(restaurant._id.toString()),
                        RESERVATION_EXPIRED,
                        reservation
                    );
                }

                emitToRoom(
                    donationRoom(reservation.donation.toString()),
                    DONATION_UPDATED,
                    { donationId: reservation.donation, status: "available" }
                );

                emitActivityFeed({
                    type: RESERVATION_EXPIRED,
                    message: "A reservation expired before being accepted.",
                    data: { reservationId: reservation._id },
                });
            }

            await emitAdminStats();

            console.log(
                `[Reservation Expiry] Processed ${reservations.length} reservation(s).`
            );
        } catch (err) {
            console.error(
                "Reservation Expiry Job:",
                err
            );
        }
    });
};
