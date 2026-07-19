const express = require("express");

const router = express.Router();

const protect = require("../middlewares/auth");
const authorize = require("../middlewares/authorize");
const { uploadImageSingle, uploadImageArray } = require("../middlewares/upload");

const controller = require("../controllers/restaurant.controller");

router.use(protect);

router.use(authorize("restaurant"));

router.post("/", controller.createRestaurant);

router.get("/me", controller.getMyRestaurant);

router.patch("/me", controller.updateRestaurant);

router.patch("/me/logo", uploadImageSingle("logo"), controller.uploadLogo);

router.patch("/me/cover", uploadImageSingle("cover"), controller.uploadCover);

router.post(
    "/me/gallery",
    uploadImageArray("images", 6),
    controller.addGalleryImages
);

router.delete("/me/gallery/:imageId", controller.removeGalleryImage);

module.exports = router;
