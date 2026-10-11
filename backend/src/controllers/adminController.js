const User = require("../models/User");
const Streak = require("../models/Streak");
const Task = require("../models/Task");
const Post = require("../models/Post");
const Follow = require("../models/Follow");
const Comment = require("../models/Comment");
const SavedPost = require("../models/SavedPost");
const Notification = require("../models/Notification");
const FocusSession = require("../models/FocusSession");
const { getLocalStartOfDay, getLocalStartOfWeek, formatDuration } = require("../utils/dateHelpers");

const ADMIN_EMAIL = "utkarzz1705@gmail.com";
const { checkAndResetStreak } = require("../services/streakService");

// Get all users with full details
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-__v").sort({ createdAt: -1 });

    // Normalize role: the admin is identified by email in middleware,
    // but the DB role field may still be 'user'. Override it here so
    // the frontend admin count is accurate.
    const normalizedUsers = users.map((u) => {
      const obj = u.toObject();
      if (obj.email === ADMIN_EMAIL) {
        obj.role = "admin";
      }
      return obj;
    });

    res.status(200).json({
      success: true,
      count: normalizedUsers.length,
      users: normalizedUsers,
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

// Admin get user tasks and streaks
const getUserTasksForAdmin = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const tasks = await Task.find({ user: userId, isDeleted: { $ne: true } }).sort({ createdAt: -1 });
    let streak = await Streak.findOne({ user: userId });
    if (streak) {
      streak = await checkAndResetStreak(streak);
    }

    res.status(200).json({
      success: true,
      tasks,
      streak,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Admin get users study/focus time with bounded pagination, sorting, search, and date filters
const getAdminStudyTime = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;
    const search = (req.query.search || "").trim();
    const sortBy = req.query.sortBy || "todayDuration"; // 'todayDuration' | 'weeklyDuration' | 'overallDuration' | 'username'
    const sortOrder = req.query.sortOrder === "asc" ? 1 : -1;
    const timeZone = (req.query.timeZone || "UTC").trim();

    const startOfDay = getLocalStartOfDay(new Date(), timeZone);
    const startOfWeek = getLocalStartOfWeek(new Date(), timeZone);

    // Build user match filter (search by username, displayName, or email)
    const userMatch = {
      isOnboarded: true,
      isBanned: { $ne: true },
    };

    if (search) {
      const searchRegex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      userMatch.$or = [
        { username: searchRegex },
        { displayName: searchRegex },
        { email: searchRegex },
      ];
    }

    // Determine sort stage
    const sortField = ["todayDuration", "weeklyDuration", "overallDuration", "username"].includes(sortBy)
      ? sortBy
      : "todayDuration";
    const sortStage = {};
    sortStage[sortField] = sortOrder;
    if (sortField !== "username") {
      sortStage.username = 1; // Tie-breaker
    }

    const pipeline = [
      { $match: userMatch },
      {
        $lookup: {
          from: "focussessions",
          let: { uid: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$user", "$$uid"] },
                    { $eq: ["$status", "completed"] },
                  ],
                },
              },
            },
            {
              $group: {
                _id: null,
                overallDuration: { $sum: "$duration" },
                todayDuration: {
                  $sum: {
                    $cond: [{ $gte: ["$startTime", startOfDay] }, "$duration", 0],
                  },
                },
                weeklyDuration: {
                  $sum: {
                    $cond: [{ $gte: ["$startTime", startOfWeek] }, "$duration", 0],
                  },
                },
              },
            },
          ],
          as: "stats",
        },
      },
      {
        $project: {
          _id: 1,
          userId: "$_id",
          username: 1,
          displayName: 1,
          email: 1,
          profilePicture: 1,
          role: 1,
          todayDuration: {
            $ifNull: [{ $arrayElemAt: ["$stats.todayDuration", 0] }, 0],
          },
          weeklyDuration: {
            $ifNull: [{ $arrayElemAt: ["$stats.weeklyDuration", 0] }, 0],
          },
          overallDuration: {
            $ifNull: [{ $arrayElemAt: ["$stats.overallDuration", 0] }, 0],
          },
        },
      },
      { $sort: sortStage },
      {
        $facet: {
          metadata: [{ $count: "total" }],
          users: [{ $skip: skip }, { $limit: limit }],
        },
      },
    ];

    const result = await User.aggregate(pipeline);
    const metadata = result[0]?.metadata[0] || { total: 0 };
    const rawUsers = result[0]?.users || [];

    const users = rawUsers.map((u) => {
      if (u.email === ADMIN_EMAIL) {
        u.role = "admin";
      }
      return {
        userId: u._id,
        username: u.username,
        displayName: u.displayName || u.username,
        email: u.email,
        profilePicture: u.profilePicture,
        role: u.role,
        todayDuration: u.todayDuration,
        todayFormatted: formatDuration(u.todayDuration),
        weeklyDuration: u.weeklyDuration,
        weeklyFormatted: formatDuration(u.weeklyDuration),
        overallDuration: u.overallDuration,
        overallFormatted: formatDuration(u.overallDuration),
      };
    });

    const total = metadata.total;
    const totalPages = Math.ceil(total / limit) || 1;

    res.status(200).json({
      success: true,
      users,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasPrevPage: page > 1,
        hasNextPage: page < totalPages,
      },
      timeZone,
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
  getUserTasksForAdmin,
  getAdminStudyTime,
};
