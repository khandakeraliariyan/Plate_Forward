const donationExpiryJob = require("./donationExpiry.job");
const reservationExpiryJob = require("./reservationExpiry.job");
const reminderJob = require("./reminder.job");

const startJobs = () => {
    donationExpiryJob();

    reservationExpiryJob();

    reminderJob();

    console.log("All background jobs started.");
};

module.exports = startJobs;