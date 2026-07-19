const express = require("express");

const router = express.Router();

router.use("/health", require("./health.routes"));

router.use("/auth", require("./auth.routes"));

router.use("/restaurants", require("./restaurant.routes"));

router.use("/donations", require("./donation.routes"));

router.use("/reservations", require("./reservation.routes"));

router.use("/notifications", require("./notification.routes"));

module.exports = router;