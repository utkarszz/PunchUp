const User = require("../models/User");
const Streak = require("../models/Streak");
const Task = require("../models/Task");
const Post = require("../models/Post");
const Follow = require("../models/Follow");
const Comment = require("../models/Comment");
const SavedPost = require("../models/SavedPost");
const Notification = require("../models/Notification");

// Get all users with full details
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-__v").sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      count: users.length,
      users,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Admin delete user account (cascade delete)
const adminDeleteUser = async (req, res) => {
  try {
    const { userId } = req.params;

    // Don't let admin delete themselves
    if (userId === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: "You cannot delete your own admin account through the admin panel",
      });
    }

    const user = await User.findByIdAndDelete(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Cascade delete all user records
    await Streak.deleteMany({ user: userId });
    await Task.deleteMany({ user: userId });
    await Post.deleteMany({ user: userId });
    await Comment.deleteMany({ user: userId });
    await SavedPost.deleteMany({ user: userId });
    await Follow.deleteMany({ $or: [{ follower: userId }, { following: userId }] });
    await Notification.deleteMany({ $or: [{ recipient: userId }, { sender: userId }] });

    res.status(200).json({
      success: true,
      message: `User ${user.username} has been permanently deleted`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Admin ban user
const adminBanUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;

    if (!reason || !reason.trim()) {
      return res.status(400).json({
        success: false,
        message: "A proper reasoning is required to ban the account",
      });
    }

    if (userId === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: "You cannot ban your own admin account",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    user.isBanned = true;
    user.banReason = reason.trim();
    await user.save();

    res.status(200).json({
      success: true,
      message: `User ${user.username} has been banned`,
      user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Admin unban user
const adminUnbanUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    user.isBanned = false;
    user.banReason = "";
    await user.save();

    res.status(200).json({
      success: true,
      message: `User ${user.username} has been unbanned`,
      user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  getAllUsers,
  adminDeleteUser,
  adminBanUser,
  adminUnbanUser,
};
