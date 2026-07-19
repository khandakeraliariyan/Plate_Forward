const express = require("express");

const router = express.Router();

const protect = require("../middlewares/auth");
const authorize = require("../middlewares/authorize");

const controller = require("../controllers/admin.controller");

router.use(protect);
router.use(authorize("admin"));

// Users
router.get("/users", controller.listUsers);
router.patch("/users/:userId/suspend", controller.setUserSuspension);
router.delete("/users/:userId", controller.deleteUser);

// Restaurants
router.patch("/restaurants/:restaurantId/verify", controller.verifyRestaurant);

// Donations
router.get("/donations", controller.getAllDonations);
router.delete("/donations/:donationId", controller.forceDeleteDonation);

// Reservations
router.get("/reservations", controller.getAllReservations);
router.patch("/reservations/:reservationId/force-cancel", controller.forceCancelReservation);

module.exports = router;
