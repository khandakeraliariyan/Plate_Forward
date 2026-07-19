const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,

    port: Number(process.env.EMAIL_PORT),

    secure: process.env.EMAIL_SECURE === "true",

    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
    },

    pool: true,
    maxConnections: 5,
    maxMessages: 100,
});

const verifyEmailConnection = async () => {
    try {
        await transporter.verify();

        console.log("✅ Email server connected successfully.");
    } catch (error) {
        console.error(
            "❌ Email server connection failed:",
            error.message
        );
    }
};

module.exports = {
    transporter,
    verifyEmailConnection,
};