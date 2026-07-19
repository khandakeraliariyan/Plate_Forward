const express = require("express");

const router = express.Router();

const protect = require("../middlewares/auth");
const authorize = require("../middlewares/authorize");
const validate = require("../middlewares/validate");

const notificationController = require("../controllers/notification.controller");

const { notificationIdSchema, broadcastSchema } = require("../validations/notification.validation");

router.use(protect);

router.get("/", notificationController.getMyNotifications);

router.get("/unread-count", notificationController.getUnreadCount);

router.patch("/read-all", notificationController.markAllAsRead);

router.patch("/:id/read", validate(notificationIdSchema), notificationController.markAsRead);

router.delete("/:id", validate(notificationIdSchema), notificationController.deleteNotification);

router.post("/broadcast", authorize("admin"), validate(broadcastSchema), notificationController.broadcastNotification);

module.exports = router;