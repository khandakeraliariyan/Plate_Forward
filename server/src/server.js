require("dotenv").config();

const http = require("http");

const app = require("./app");

const connectDB = require("./config/db");

const { verifyEmailConnection } = require("./config/email");

const startJobs = require("./jobs");

const { initSocket, shutdownSocket } = require("./socket");

const PORT = process.env.PORT || 5000;

const startServer = async () => {
    try {
        // Connect MongoDB
        await connectDB();

        console.log("✅ MongoDB connected.");

        // Verify Email Service
        await verifyEmailConnection();

        // Start Background Jobs
        startJobs();

        // Create HTTP Server
        const server = http.createServer(app);

        // Initialize Socket.IO
        initSocket(server);

        console.log("✅ Socket.IO initialized.");

        server.listen(PORT, () => {
            console.log(
                `🚀 Server running on port ${PORT}`
            );
        });

        server.on("error", (error) => {
            console.error(
                "Server Error:",
                error
            );
        });

        const gracefulShutdown = async (signal) => {
            console.log(`\n${signal} received. Gracefully shutting down...`);

            await shutdownSocket();

            console.log("Socket.IO Closed.");

            server.close(() => {
                console.log("HTTP Server Closed.");

                process.exit(0);
            });
        };

        process.on("SIGINT", () => gracefulShutdown("SIGINT"));

        process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    } catch (error) {
        console.error(
            "Failed to start server:",
            error
        );

        process.exit(1);
    }
};

startServer();