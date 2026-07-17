const express = require("express");

const router = express.Router();

const protect = require("../middlewares/auth");
const authorize = require("../middlewares/authorize");

const controller = require("../controllers/restaurant.controller");

router.use(protect);

router.use(authorize("restaurant"));

router.post("/", controller.createRestaurant);

router.get("/me", controller.getMyRestaurant);

module.exports = router;