const Streak = require("../models/Streak");

const getDateOnly = (date) => {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );
};

const updateStreak = async (userId) => {
  const today = getDateOnly(new Date());

  let streak = await Streak.findOne({
    user: userId,
  });

  if (!streak) {
    return await Streak.create({
      user: userId,
      currentStreak: 1,
      longestStreak: 1,
      lastCompletedDate: today,
    });
  }

  const lastDate = getDateOnly(
    new Date(streak.lastCompletedDate)
  );

  const diffInDays =
    (today - lastDate) / (1000 * 60 * 60 * 24);

  if (diffInDays === 0) {
    return streak;
  }

  if (diffInDays === 1) {
    streak.currentStreak += 1;
  } else {
    streak.currentStreak = 1;
  }

  if (streak.currentStreak > streak.longestStreak) {
    streak.longestStreak = streak.currentStreak;
  }

  streak.lastCompletedDate = today;

  await streak.save();

  return streak;
};

const checkAndResetStreak = async (streak) => {
  if (!streak) return null;
  const today = getDateOnly(new Date());
  const lastDate = getDateOnly(new Date(streak.lastCompletedDate));
  const diffInDays = (today - lastDate) / (1000 * 60 * 60 * 24);
  if (diffInDays > 1 && streak.currentStreak > 0) {
    streak.currentStreak = 0;
    await streak.save();
  }
  return streak;
};

module.exports = {
  updateStreak,
  checkAndResetStreak,
};