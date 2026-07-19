const cron = require("node-cron");

module.exports = () => {
    cron.schedule(
        "0 * * * *",
        async () => {
            console.log(
                "Reminder job executed."
            );

            /*
            Future:

            - Donation expiry reminders

            - Pickup reminders

            - Delivery reminders

            - Weekly reports

            - Email reminders
            */
        }
    );
};