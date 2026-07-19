const express = require("express");

const router = express.Router();

const authController = require("../controllers/auth.controller");

const protect = require("../middlewares/auth");
const authLimiter = require("../middlewares/authLimiter");
const { verifyCsrfToken } = require("../middlewares/csrf");

router.post("/register", authLimiter, authController.register);

router.post("/login", authLimiter, authController.login);

// Cookie-only auth (no Bearer token) - CSRF-protected via double-submit cookie.
router.post("/refresh", verifyCsrfToken, authController.refresh);

router.post("/logout", verifyCsrfToken, authController.logout);

router.post("/logout-all", protect, authController.logoutAll);

router.get("/me", protect, authController.getMe);

router.get("/verify-email/:token", authController.verifyEmail);

router.post("/forgot-password", authLimiter, authController.forgotPassword);

router.post("/reset-password/:token", authLimiter, authController.resetPassword);

router.patch("/change-password", protect, authController.changePassword);

module.exports = router;
