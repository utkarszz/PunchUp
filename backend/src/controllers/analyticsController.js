const Task = require("../models/Task");
const Streak = require("../models/Streak");

const getAnalytics = async (req, res) => {
  try {
    const totalTasks = await Task.countDocuments({
      user: req.user._id,
    });

    const completedTasks = await Task.countDocuments({
      user: req.user._id,
      completed: true,
    });

    const pendingTasks = await Task.countDocuments({
      user: req.user._id,
      completed: false,
    });

    const streak = await Streak.findOne({
      user: req.user._id,
    });

    const completionRate =
      totalTasks === 0
        ? 0
        : Math.round(
            (completedTasks / totalTasks) * 100
          );

    res.status(200).json({
      success: true,
      analytics: {
        totalTasks,
        completedTasks,
        pendingTasks,
        completionRate,
        currentStreak:
          streak?.currentStreak || 0,
        longestStreak:
          streak?.longestStreak || 0,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  getAnalytics,
};