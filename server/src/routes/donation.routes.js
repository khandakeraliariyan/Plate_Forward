const express = require("express");

const router = express.Router();

const protect = require("../middlewares/auth");
const authorize = require("../middlewares/authorize");

const donationController = require("../controllers/donation.controller");

router.use(protect);

router.post("/", authorize("restaurant"), donationController.createDonation);

router.get("/me", authorize("restaurant"), donationController.getMyDonations);

router.patch("/:id", authorize("restaurant"), donationController.updateDonation);

router.delete("/:id", authorize("restaurant"), donationController.deleteDonation);

router.get("/:id", donationController.getDonationById);

module.exports = router;