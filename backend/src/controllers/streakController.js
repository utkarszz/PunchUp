const Streak = require("../models/Streak");
const { checkAndResetStreak } = require("../services/streakService");

const getStreak = async (req, res) => {
  try {
    let streak = await Streak.findOne({
      user: req.user._id,
    });

    if (streak) {
      streak = await checkAndResetStreak(streak);
    }

    res.status(200).json({
      success: true,
      streak,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  getStreak,
};