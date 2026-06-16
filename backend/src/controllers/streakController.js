const Streak = require("../models/Streak");

const getDateOnly = (date) => {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );
};

const getStreak = async (req, res) => {
  try {
    const streak = await Streak.findOne({
      user: req.user._id,
    });

    if (!streak) {
      return res.status(200).json({
        success: true,
        streak: null,
      });
    }

    const today = getDateOnly(new Date());

    const lastDate = getDateOnly(
      new Date(streak.lastCompletedDate)
    );

    const diffInDays =
      (today - lastDate) / (1000 * 60 * 60 * 24);

    if (diffInDays > 1 && streak.currentStreak > 0) {
      streak.currentStreak = 0;

      await streak.save();
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