const express = require("express");

const router = express.Router();

const protect = require("../middlewares/auth");
const authorize = require("../middlewares/authorize");

const reservationController = require("../controllers/reservation.controller");

// All reservation routes require authentication
router.use(protect);

router.post("/:donationId", authorize("ngo"), reservationController.reserveDonation);

router.patch("/:reservationId/cancel", authorize("ngo"), reservationController.cancelReservation);

router.get("/my", authorize("ngo"), reservationController.getNGOReservations);

router.get("/restaurant", authorize("restaurant"), reservationController.getRestaurantReservations);

router.patch("/:reservationId/accept", authorize("restaurant"), reservationController.acceptReservation);

router.patch("/:reservationId/complete", authorize("restaurant", "admin"), reservationController.completeReservation);

router.patch("/:reservationId/pickup", authorize("volunteer"), reservationController.pickupReservation);

router.patch("/:reservationId/deliver", authorize("volunteer"), reservationController.deliverReservation);

router.post("/:reservationId/rating", authorize("ngo"), reservationController.rateReservation);

router.get("/:reservationId", reservationController.getReservationById);

module.exports = router;