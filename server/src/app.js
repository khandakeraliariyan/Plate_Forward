const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const cookieParser = require("cookie-parser");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");

const corsOptions = require("./config/cors");

const routes = require("./routes");

const notFound = require("./middlewares/notFound");
const errorHandler = require("./middlewares/errorHandler");
const ipBlockGuard = require("./middlewares/ipBlockGuard");
const sanitizeRequest = require("./middlewares/sanitize");

const app = express();

// Off by default: only enable if actually deployed behind a reverse proxy /
// load balancer (Nginx, Render, Heroku, etc.). Blindly trusting
// X-Forwarded-For when there's no real proxy in front lets a client spoof
// its own IP, which would defeat both rate limiting and IP blocking.
// TRUST_PROXY is the number of hops to trust (e.g. "1" for a single proxy).
if (process.env.TRUST_PROXY) {
    app.set("trust proxy", Number(process.env.TRUST_PROXY) || 1);
}

app.use(helmet());

app.use(
    rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 200,
        standardHeaders: true,
        legacyHeaders: false,
        message: {
            success: false,
            message:
                "Too many requests. Please try again later.",
        },
    })
);

app.use(ipBlockGuard);

app.use(cors(corsOptions));

app.use(compression());

app.use(express.json({ limit: "10mb" }));

app.use(
    express.urlencoded({
        extended: true,
        limit: "10mb",
    })
);

app.use(cookieParser());

app.use(sanitizeRequest);

// Request (access) logging - always on, not just in dev, so production
// traffic is auditable too; "combined" is the standard Apache-style format.
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

app.get("/", (req, res) => {
    res.status(200).json({
        success: true,
        message: "PlateForward API is running.",
        version: "1.0.0",
        environment: process.env.NODE_ENV,
    });
});

app.use("/api/v1", routes);

app.use(notFound);

app.use(errorHandler);

module.exports = app;