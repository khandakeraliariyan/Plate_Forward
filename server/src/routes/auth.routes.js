const express = require("express");

const router = express.Router();

const authController = require("../controllers/auth.controller");

const protect = require("../middlewares/auth");
const authLimiter = require("../middlewares/authLimiter");

router.post("/register", authLimiter, authController.register);

router.post("/login", authLimiter, authController.login);

router.post("/refresh", authController.refresh);

router.post("/logout", authController.logout);

router.post("/logout-all", protect, authController.logoutAll);

router.get("/me", protect, authController.getMe);

router.get("/verify-email/:token", authController.verifyEmail);

router.post("/forgot-password", authLimiter, authController.forgotPassword);

router.post("/reset-password/:token", authLimiter, authController.resetPassword);

module.exports = router;
