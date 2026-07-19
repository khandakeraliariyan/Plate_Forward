const express = require("express");

const router = express.Router();

const protect = require("../middlewares/auth");
const authorize = require("../middlewares/authorize");
const { uploadImageSingle, uploadDocumentSingle } = require("../middlewares/upload");

const controller = require("../controllers/user.controller");

router.use(protect);

router.get("/me", controller.getProfile);

router.patch(
    "/me/ngo-preferences",
    authorize("ngo"),
    controller.updateNgoPreferences
);

router.get(
    "/me/recommendations",
    authorize("ngo"),
    controller.getRecommendations
);

router.patch("/me/avatar", uploadImageSingle("avatar"), controller.uploadAvatar);

router.post(
    "/me/documents",
    uploadDocumentSingle("document"),
    controller.uploadDocument
);

router.delete("/me/documents/:documentId", controller.deleteDocument);

module.exports = router;
