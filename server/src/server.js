require("dotenv").config();

const http = require("http");

const app = require("./app");

const connectDB = require("./config/db");

const startJobs = require("./jobs");

const PORT = process.env.PORT || 5000;

const startServer = async () => {
    await connectDB();

    startJobs();

    const server = http.createServer(app);

    server.listen(PORT, () => {
        console.log(`
==========================================
🚀 PlateForward API Started
🌐 Port: ${PORT}
📦 Environment: ${process.env.NODE_ENV}
==========================================
`);
    });
};

startServer();