const notificationService = require("../services/notification.service");
const catchAsync = require("../utils/catchAsync");

const getMyNotifications = catchAsync(async (req, res) => {
    const { page = 1, limit = 20 } = req.query;

    const result = await notificationService.getMyNotifications(
        req.user._id,
        page,
        limit
    );

    res.status(200).json({
        success: true,
        message: "Notifications fetched successfully.",
        data: result,
    });
});

const getUnreadCount = catchAsync(async (req, res) => {
    const count = await notificationService.getUnreadCount(req.user._id);

    res.status(200).json({
        success: true,
        data: {
            unreadCount: count,
        },
    });
});

const markAsRead = catchAsync(async (req, res) => {
    const notification = await notificationService.markAsRead(
        req.params.id,
        req.user._id
    );

    res.status(200).json({
        success: true,
        message: "Notification marked as read.",
        data: notification,
    });
});

const markAllAsRead = catchAsync(async (req, res) => {
    await notificationService.markAllAsRead(req.user._id);

    res.status(200).json({
        success: true,
        message: "All notifications marked as read.",
    });
});

const deleteNotification = catchAsync(async (req, res) => {
    await notificationService.deleteNotification(
        req.params.id,
        req.user._id
    );

    res.status(200).json({
        success: true,
        message: "Notification deleted successfully.",
    });
});

const broadcastNotification = catchAsync(async (req, res) => {
    const result = await notificationService.broadcastNotification(req.body);

    res.status(201).json({
        success: true,
        message: "Broadcast notification sent successfully.",
        data: result,
    });
});

module.exports = {
    getMyNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    broadcastNotification,
};