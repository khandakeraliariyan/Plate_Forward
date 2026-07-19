const Notification = require("../models/notification.model");
const User = require("../models/user.model");
const ApiError = require("../utils/ApiError");

const createNotification = async ({
    user,
    title,
    message,
    type,
    priority = "medium",
    data = {},
}) => {
    return await Notification.create({
        user,
        title,
        message,
        type,
        priority,
        data,
    });
};

const getMyNotifications = async (userId, page = 1, limit = 20) => {
    page = Number(page);
    limit = Number(limit);

    const skip = (page - 1) * limit;

    const notifications = await Notification.find({
        user: userId,
    })
        .sort({
            createdAt: -1,
        })
        .skip(skip)
        .limit(limit);

    const total = await Notification.countDocuments({
        user: userId,
    });

    return {
        page,
        limit,
        total,
        totalPages: Math.ceil(
            total / limit
        ),
        notifications,
    };
};

const getUnreadCount = async (userId) => {
    return await Notification.countDocuments(
        {
            user: userId,
            isRead: false,
        }
    );
};

const markAsRead = async (notificationId, userId) => {
    const notification = await Notification.findOne({
        _id: notificationId,
        user: userId,
    });

    if (!notification) {
        throw new ApiError(404, "Notification not found.");
    }

    notification.isRead = true;

    await notification.save();

    return notification;
};

const markAllAsRead = async (userId) => {
    await Notification.updateMany(
        {
            user: userId,
            isRead: false,
        },
        {
            isRead: true,
        }
    );

    return {
        success: true,
    };
};

const deleteNotification = async (notificationId, userId) => {
    const notification = await Notification.findOneAndDelete(
        {
            _id: notificationId,
            user: userId,
        }
    );

    if (!notification) {
        throw new ApiError(
            404,
            "Notification not found."
        );
    }

    return notification;
};

const broadcastNotification = async ({
    title,
    message,
    type = "SYSTEM",
    priority = "medium",
    roles,
}) => {
    const filter = {};

    if (roles && roles.length) {
        filter.role = {
            $in: roles,
        };
    }

    const users = await User.find(filter).select("_id");

    const notifications = users.map((user) => ({
        user: user._id,
        title,
        message,
        type,
        priority,
    }));

    await Notification.insertMany(notifications);

    return {
        sent: notifications.length,
    };
};

module.exports = {
    createNotification,
    getMyNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    broadcastNotification,
};