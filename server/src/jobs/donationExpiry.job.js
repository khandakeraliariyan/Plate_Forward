const cron = require("node-cron");

const donationService = require("../services/donation.service");

module.exports = () => {
    cron.schedule("* * * * *", async () => {
        try {
            const { count } = await donationService.expireDonations();

            if (count) {
                console.log(
                    `[Donation Expiry] Processed ${count} donation(s).`
                );
            }
        } catch (err) {
            console.error(
                "Donation Expiry Job:",
                err
            );
        }
    });
};
