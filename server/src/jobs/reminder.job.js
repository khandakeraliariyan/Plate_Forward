const cron = require("node-cron");

const Donation = require("../models/Donation");
const Restaurant = require("../models/Restaurant");

const notificationService = require("../services/notification.service");
const emailService = require("../services/email.service");
const donationExpiringSoonTemplate = require("../templates/donationExpiringSoon.template");

// Donations expiring within this window (and not yet reminded) get a
// one-time "expiring soon, still unreserved" nudge to the restaurant.
const REMINDER_WINDOW_HOURS = 3;

module.exports = () => {
    cron.schedule("0 * * * *", async () => {
        try {
            const now = new Date();
            const windowEnd = new Date(now.getTime() + REMINDER_WINDOW_HOURS * 3_600_000);

            const donations = await Donation.find({
                status: "available",
                expiryTime: { $gte: now, $lte: windowEnd },
                reminderSentAt: null,
            });

            if (!donations.length) {
                return;
            }

            for (const donation of donations) {
                const restaurant = await Restaurant.findById(donation.restaurant).populate(
                    "user"
                );

                if (!restaurant?.user) {
                    continue;
                }

                const hoursRemaining = Math.max(
                    1,
                    Math.round((donation.expiryTime.getTime() - now.getTime()) / 3_600_000)
                );

                await notificationService.createNotification({
                    user: restaurant.user._id,
                    title: "Donation Expiring Soon",
                    message: `"${donation.title}" expires in about ${hoursRemaining} hour(s) and hasn't been reserved yet.`,
                    type: "DONATION_EXPIRED",
                    priority: "medium",
                    data: {
                        donation: donation._id,
                        restaurant: restaurant._id,
                    },
                });

                await emailService.sendTemplateEmail({
                    to: restaurant.user.email,
                    subject: "Your Donation Is Expiring Soon",
                    template: donationExpiringSoonTemplate,
                    data: {
                        title: donation.title,
                        hoursRemaining,
                    },
                });

                donation.reminderSentAt = now;

                await donation.save();
            }

            console.log(`[Reminder Job] Sent ${donations.length} expiring-soon reminder(s).`);
        } catch (err) {
            console.error("Reminder Job:", err);
        }
    });
};
