const cron = require("node-cron");

const Donation = require("../models/donation.model");
const Reservation = require("../models/reservation.model");
const Restaurant = require("../models/restaurant.model");

const notificationService = require("../services/notification.service");

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
            }

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