const Notification = require("../models/notification.model");
const User = require("../models/User");
const ApiError = require("../utils/ApiError");

const emailService = require("./email.service");

const { emitToRoom } = require("../socket");
const { userRoom } = require("../socket/rooms");
const {
    NEW_NOTIFICATION,
    NOTIFICATION_READ,
    NOTIFICATION_DELETED,
    UNREAD_COUNT_UPDATED,
} = require("../socket/events");

const createNotification = async ({
    user,
    title,
    message,
    type,
    priority = "medium",
    data = {},
}) => {
    const notification = await Notification.create({
        user,
        title,
        message,
        type,
        priority,
        data,
    });

    const room = userRoom(user);

    emitToRoom(room, NEW_NOTIFICATION, notification);

    emitToRoom(room, UNREAD_COUNT_UPDATED, {
        count: await getUnreadCount(user),
    });

    return notification;
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

    const room = userRoom(userId);

    emitToRoom(room, NOTIFICATION_READ, notification);

    emitToRoom(room, UNREAD_COUNT_UPDATED, {
        count: await getUnreadCount(userId),
    });

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

    emitToRoom(userRoom(userId), UNREAD_COUNT_UPDATED, {
        count: 0,
    });

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

    const room = userRoom(userId);

    emitToRoom(room, NOTIFICATION_DELETED, {
        id: notificationId,
    });

    emitToRoom(room, UNREAD_COUNT_UPDATED, {
        count: await getUnreadCount(userId),
    });

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

    const users = await User.find(filter).select("_id email");

    const notifications = users.map((user) => ({
        user: user._id,
        title,
        message,
        type,
        priority,
    }));

    await Notification.insertMany(notifications);

    await emailService.sendBulkEmail({
        recipients: users.map((u) => u.email),
        subject: title,
        html: message,
    });

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