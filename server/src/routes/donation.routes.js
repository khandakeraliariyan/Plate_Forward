const express = require("express");

const router = express.Router();

const protect = require("../middlewares/auth");
const authorize = require("../middlewares/authorize");
const { uploadImageArray } = require("../middlewares/upload");

const donationController = require("../controllers/donation.controller");

// Public
router.get("/", donationController.getAllDonations);

// Protected
router.use(protect);
router.use(authorize("restaurant"));

router.get("/me", donationController.getMyDonations);
router.post("/", uploadImageArray("images", 5), donationController.createDonation);
router.patch("/:id", donationController.updateDonation);
router.delete("/:id", donationController.deleteDonation);

router.post(
    "/:id/images",
    uploadImageArray("images", 5),
    donationController.addDonationImages
);
router.delete("/:id/images/:imageId", donationController.removeDonationImage);

// Parameterized route last
router.get("/:id", donationController.getDonationById);

module.exports = router;
