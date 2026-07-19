const express = require("express");

const router = express.Router();

const protect = require("../middlewares/auth");
const authorize = require("../middlewares/authorize");

const controller = require("../controllers/maps.controller");

// Public - map pins for browsing, same data already public via
// GET /donations and restaurant listings, just shaped for a map layer.
router.get("/nearby-donations", controller.getNearbyDonations);

router.get("/restaurants", controller.getRestaurantLocations);

// Protected
router.use(protect);

router.get("/ngos", authorize("admin"), controller.getNgoLocations);

router.post("/distance-matrix", controller.getDistanceMatrix);

router.post("/eta", controller.getEta);

router.post("/optimize-route", controller.optimizeRoute);

router.get("/my-route", authorize("volunteer"), controller.getMyRoute);

module.exports = router;
