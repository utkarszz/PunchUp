const Notification = require("../models/Notification");

const getNotifications = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const totalNotifications = await Notification.countDocuments({
      recipient: req.user._id,
    });

    const notifications = await Notification.find({
      recipient: req.user._id,
    })
      .populate("sender", "username displayName profilePicture")
      .populate("task", "title dueDate completed priority")
      .populate("post", "content images shareId")
      .populate("comment", "content parentComment")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      currentPage: page,
      totalPages: Math.ceil(totalNotifications / limit),
      totalNotifications,
      count: notifications.length,
      notifications,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    if (notification.recipient.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to read this notification",
      });
    }

    notification.isRead = true;
    await notification.save();

    res.status(200).json({
      success: true,
      notification,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user._id, isRead: false },
      { isRead: true }
    );

    res.status(200).json({
      success: true,
      message: "All notifications marked as read",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getUnreadCount = async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      recipient: req.user._id,
      isRead: false,
    });

    res.status(200).json({
      success: true,
      count,
      unreadCount: count,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const PushSubscription = require('../models/PushSubscription');
const { getPublicKey } = require('../services/pushService');

const getVapidPublicKey = async (req, res) => {
  try {
    const publicKey = getPublicKey();
    res.status(200).json({ success: true, publicKey });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const subscribePush = async (req, res) => {
  try {
    const { endpoint, keys } = req.body;
    if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
      return res.status(400).json({
        success: false,
        message: 'Invalid subscription payload. Must include endpoint and keys (p256dh, auth).',
      });
    }

    const subscription = await PushSubscription.findOneAndUpdate(
      { endpoint },
      {
        user: req.user._id,
        endpoint,
        keys: {
          p256dh: keys.p256dh,
          auth: keys.auth,
        },
        userAgent: req.headers['user-agent'] || '',
      },
      { upsert: true, new: true, runValidators: true }
    );

    res.status(200).json({ success: true, subscriptionId: subscription._id });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const unsubscribePush = async (req, res) => {
  try {
    const { endpoint } = req.body;
    if (endpoint) {
      await PushSubscription.deleteOne({ endpoint, user: req.user._id });
    } else {
      await PushSubscription.deleteMany({ user: req.user._id });
    }
    res.status(200).json({ success: true, message: 'Unsubscribed from push notifications.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
  getVapidPublicKey,
  subscribePush,
  unsubscribePush,
};
