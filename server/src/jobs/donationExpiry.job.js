const cron = require("node-cron");

const Donation = require("../models/donation.model");
const Restaurant = require("../models/restaurant.model");

const notificationService = require("../services/notification.service");

module.exports = () => {
    cron.schedule("* * * * *", async () => {
        try {
            const expiredDonations =
                await Donation.find({
                    status: "available",
                    expiryTime: {
                        $lte: new Date(),
                    },
                });

            if (!expiredDonations.length) {
                return;
            }

            for (const donation of expiredDonations) {
                donation.status = "expired";

                await donation.save();

                const restaurant =
                    await Restaurant.findById(
                        donation.restaurant
                    ).populate("user");

                if (restaurant?.user) {
                    await notificationService.createNotification({
                        user: restaurant.user._id,
                        title: "Donation Expired",
                        message:
                            "One of your donations expired before it was reserved.",
                        type: "DONATION_EXPIRED",
                        priority: "medium",
                        data: {
                            donation: donation._id,
                            restaurant:
                                restaurant._id,
                        },
                    });
                }
            }

            console.log(
                `[Donation Expiry] Processed ${expiredDonations.length} donation(s).`
            );
        } catch (err) {
            console.error(
                "Donation Expiry Job:",
                err
            );
        }
    });
};