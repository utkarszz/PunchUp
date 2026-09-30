const PointEvent = require('../models/PointEvent');
const Task = require('../models/Task');
const User = require('../models/User');

// ── League configuration ─────────────────────────────────────────────────────
// Change these thresholds here to update ALL leaderboards, badges, and filters.
const LEAGUE_THRESHOLDS = [
  { name: 'Rookie',   min: 0    },
  { name: 'Bronze',   min: 100  },
  { name: 'Silver',   min: 300  },
  { name: 'Gold',     min: 700  },
  { name: 'Platinum', min: 1500 },
  { name: 'Diamond',  min: 3000 },
  { name: 'Master',   min: 6000 },
];

// ── League calculation ───────────────────────────────────────────────────────
const getLeague = (totalPoints = 0) => {
  for (let i = LEAGUE_THRESHOLDS.length - 1; i >= 0; i--) {
    if (totalPoints >= LEAGUE_THRESHOLDS[i].min) {
      return LEAGUE_THRESHOLDS[i].name;
    }
  }
  return 'Rookie';
};

// ── Weekly period helper (Monday 00:00 UTC) ──────────────────────────────────
const getWeekStart = () => {
  const now = new Date();
  const dayOfWeek = now.getUTCDay(); // 0=Sun,1=Mon,...,6=Sat
  const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // days since Monday
  const weekStart = new Date(now);
  weekStart.setUTCDate(now.getUTCDate() - diff);
  weekStart.setUTCHours(0, 0, 0, 0);
  return weekStart;
};

// ── Award points for task completion ────────────────────────────────────────
// Idempotent: safe to call multiple times for the same task.
// Layer 1: task.pointsAwarded flag (fast early-exit)
// Layer 2: MongoDB unique index on (user, task, reason) blocks duplicate insert
const awardTaskCompletionPoints = async (userId, taskId) => {
  const POINTS = 10;

  // Layer 1 — fast flag check (avoids DB round-trip on repeat calls)
  const task = await Task.findById(taskId).select('pointsAwarded');
  if (!task || task.pointsAwarded) return { awarded: false, points: 0 };

  // Daily cap protection: prevents automated scripts from generating unlimited points in a day
  const DAILY_POINT_CAP = 200; // max 200 points (20 tasks) per day
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  const todayEvents = await PointEvent.aggregate([
    { $match: { user: userId, awardedAt: { $gte: todayStart } } },
    { $group: { _id: null, total: { $sum: '$points' } } },
  ]);
  const earnedToday = todayEvents[0]?.total || 0;
  if (earnedToday >= DAILY_POINT_CAP) {
    // Mark task as processed for points so it doesn't try again later
    await Task.findByIdAndUpdate(taskId, { pointsAwarded: true });
    return { awarded: false, points: 0, message: 'Daily points limit reached (200 pts/day)' };
  }

  try {
    // Layer 2 — insert event (unique index will throw on duplicate)
    await PointEvent.create({
      user: userId,
      task: taskId,
      points: POINTS,
      reason: 'task_completion',
      awardedAt: new Date(),
    });

    // Atomically update user total and mark task as awarded
    await Promise.all([
      User.findByIdAndUpdate(userId, { $inc: { totalPoints: POINTS } }),
      Task.findByIdAndUpdate(taskId, { pointsAwarded: true }),
    ]);

    const updatedUser = await User.findById(userId).select('totalPoints');
    return {
      awarded: true,
      points: POINTS,
      newTotalPoints: updatedUser?.totalPoints || POINTS,
    };
  } catch (err) {
    // Duplicate key error = already awarded; silently ignore
    if (err.code === 11000) {
      return { awarded: false, points: 0 };
    }
    throw err;
  }
};

// ── Get weekly points for a single user ─────────────────────────────────────
const getWeeklyPoints = async (userId) => {
  const weekStart = getWeekStart();
  const result = await PointEvent.aggregate([
    { $match: { user: userId, awardedAt: { $gte: weekStart } } },
    { $group: { _id: null, total: { $sum: '$points' } } },
  ]);
  return result[0]?.total || 0;
};

module.exports = {
  LEAGUE_THRESHOLDS,
  getLeague,
  getWeekStart,
  awardTaskCompletionPoints,
  getWeeklyPoints,
};
