const User = require('../models/User');
const PointEvent = require('../models/PointEvent');
const FocusSession = require('../models/FocusSession');
const { getLeague, getWeekStart, LEAGUE_THRESHOLDS } = require('../services/pointService');
const { getLocalStartOfDay, getLocalStartOfWeek, formatDuration } = require('../utils/dateHelpers');

// ── Overall Leaderboard (lifetime totalPoints) ───────────────────────────────
const getOverallLeaderboard = async (req, res) => {
  try {
    const users = await User.find({ isOnboarded: true, isBanned: { $ne: true } })
      .select('username displayName profilePicture totalPoints')
      .sort({ totalPoints: -1, createdAt: 1 })
      .limit(50)
      .lean();

    const leaderboard = users.map((u, index) => ({
      rank: index + 1,
      userId: u._id,
      username: u.username,
      displayName: u.displayName,
      profilePicture: u.profilePicture,
      totalPoints: u.totalPoints || 0,
      league: getLeague(u.totalPoints || 0),
    }));

    // Calculate current user's rank if authenticated
    let currentUserRank = null;
    if (req.user) {
      const currentUserId = req.user._id.toString();
      const inTopList = leaderboard.find(e => e.userId.toString() === currentUserId);

      if (inTopList) {
        currentUserRank = { ...inTopList };
      } else {
        const userPoints = req.user.totalPoints || 0;
        // Count users who have more points, or equal points with earlier createdAt
        const higherCount = await User.countDocuments({
          isOnboarded: true,
          isBanned: { $ne: true },
          $or: [
            { totalPoints: { $gt: userPoints } },
            { totalPoints: userPoints, createdAt: { $lt: req.user.createdAt } },
          ],
        });

        currentUserRank = {
          rank: higherCount + 1,
          userId: req.user._id,
          username: req.user.username,
          displayName: req.user.displayName,
          profilePicture: req.user.profilePicture,
          totalPoints: userPoints,
          league: getLeague(userPoints),
        };
      }
    }

    res.status(200).json({ success: true, leaderboard, currentUserRank });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Weekly Leaderboard (points earned during current Mon–Sun UTC week) ────────
const getWeeklyLeaderboard = async (req, res) => {
  try {
    const weekStart = getWeekStart();

    // Aggregate PointEvents for this week, grouped by user
    const weeklyPoints = await PointEvent.aggregate([
      { $match: { awardedAt: { $gte: weekStart } } },
      {
        $group: {
          _id: '$user',
          weeklyPoints: { $sum: '$points' },
        },
      },
      { $sort: { weeklyPoints: -1 } },
      { $limit: 50 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'userInfo',
        },
      },
      { $unwind: '$userInfo' },
      {
        $match: {
          'userInfo.isOnboarded': true,
          'userInfo.isBanned': { $ne: true },
        },
      },
      {
        $project: {
          _id: 0,
          userId: '$_id',
          username: '$userInfo.username',
          displayName: '$userInfo.displayName',
          profilePicture: '$userInfo.profilePicture',
          totalPoints: '$userInfo.totalPoints',
          weeklyPoints: 1,
        },
      },
    ]);

    const leaderboard = weeklyPoints.map((entry, index) => ({
      rank: index + 1,
      ...entry,
      league: getLeague(entry.totalPoints || 0),
    }));

    // Calculate current user's weekly rank if authenticated
    let currentUserRank = null;
    if (req.user) {
      const currentUserId = req.user._id.toString();
      const inTopList = leaderboard.find(e => e.userId.toString() === currentUserId);

      if (inTopList) {
        currentUserRank = { ...inTopList };
      } else {
        // Compute user's points this week
        const userWeekAgg = await PointEvent.aggregate([
          { $match: { user: req.user._id, awardedAt: { $gte: weekStart } } },
          { $group: { _id: '$user', points: { $sum: '$points' } } },
        ]);
        const userPoints = userWeekAgg[0]?.points || 0;

        // Count how many users earned more points this week
        const higherAgg = await PointEvent.aggregate([
          { $match: { awardedAt: { $gte: weekStart } } },
          { $group: { _id: '$user', totalWeekly: { $sum: '$points' } } },
          { $match: { totalWeekly: { $gt: userPoints } } },
          { $count: 'count' },
        ]);
        const higherCount = higherAgg[0]?.count || 0;

        currentUserRank = {
          rank: higherCount + 1,
          userId: req.user._id,
          username: req.user.username,
          displayName: req.user.displayName,
          profilePicture: req.user.profilePicture,
          totalPoints: req.user.totalPoints || 0,
          weeklyPoints: userPoints,
          league: getLeague(req.user.totalPoints || 0),
        };
      }
    }

    res.status(200).json({
      success: true,
      weekStart: weekStart.toISOString(),
      leaderboard,
      currentUserRank,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── League-Specific Leaderboard ──────────────────────────────────────────────
// Filters users by the computed league from their totalPoints.
const getLeagueLeaderboard = async (req, res) => {
  try {
    const leagueName = req.params.league;

    // Validate league name
    const validLeagues = LEAGUE_THRESHOLDS.map(t => t.name.toLowerCase());
    if (!validLeagues.includes(leagueName.toLowerCase())) {
      return res.status(400).json({ success: false, message: 'Invalid league name' });
    }

    // Find the threshold band for this league
    const idx = LEAGUE_THRESHOLDS.findIndex(
      t => t.name.toLowerCase() === leagueName.toLowerCase()
    );
    const minPoints = LEAGUE_THRESHOLDS[idx].min;
    const maxPoints =
      idx < LEAGUE_THRESHOLDS.length - 1
        ? LEAGUE_THRESHOLDS[idx + 1].min - 1
        : Infinity;

    const query = {
      isOnboarded: true,
      isBanned: { $ne: true },
      totalPoints: { $gte: minPoints },
    };
    if (maxPoints !== Infinity) {
      query.totalPoints.$lte = maxPoints;
    }

    const users = await User.find(query)
      .select('username displayName profilePicture totalPoints')
      .sort({ totalPoints: -1, createdAt: 1 })
      .limit(50)
      .lean();

    const leaderboard = users.map((u, index) => ({
      rank: index + 1,
      userId: u._id,
      username: u.username,
      displayName: u.displayName,
      profilePicture: u.profilePicture,
      totalPoints: u.totalPoints || 0,
      league: getLeague(u.totalPoints || 0),
    }));

    // Calculate current user's league rank if authenticated
    let currentUserRank = null;
    if (req.user) {
      const userPoints = req.user.totalPoints || 0;
      const userLeague = getLeague(userPoints);

      if (userLeague.toLowerCase() === leagueName.toLowerCase()) {
        const currentUserId = req.user._id.toString();
        const inTopList = leaderboard.find(e => e.userId.toString() === currentUserId);

        if (inTopList) {
          currentUserRank = { ...inTopList };
        } else {
          const higherCount = await User.countDocuments({
            ...query,
            $or: [
              { totalPoints: { $gt: userPoints } },
              { totalPoints: userPoints, createdAt: { $lt: req.user.createdAt } },
            ],
          });

          currentUserRank = {
            rank: higherCount + 1,
            userId: req.user._id,
            username: req.user.username,
            displayName: req.user.displayName,
            profilePicture: req.user.profilePicture,
            totalPoints: userPoints,
            league: userLeague,
          };
        }
      }
    }

    res.status(200).json({
      success: true,
      league: leagueName,
      leaderboard,
      currentUserRank,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Focus Time Leaderboard (Daily, Weekly, Overall) ───────────────────────────
const getFocusLeaderboard = async (req, res) => {
  try {
    const period = (req.query.period || 'daily').toLowerCase();
    const timeZone = (req.query.timeZone || 'UTC').trim();

    if (!['daily', 'weekly', 'overall'].includes(period)) {
      return res.status(400).json({
        success: false,
        message: "Invalid period. Must be 'daily', 'weekly', or 'overall'.",
      });
    }

    const matchStage = {
      status: 'completed',
    };

    if (period === 'daily') {
      const startOfDay = getLocalStartOfDay(new Date(), timeZone);
      matchStage.startTime = { $gte: startOfDay };
    } else if (period === 'weekly') {
      const startOfWeek = getLocalStartOfWeek(new Date(), timeZone);
      matchStage.startTime = { $gte: startOfWeek };
    }

    const aggregated = await FocusSession.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$user',
          totalDuration: { $sum: '$duration' },
        },
      },
      { $sort: { totalDuration: -1 } },
      { $limit: 50 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'userInfo',
        },
      },
      { $unwind: '$userInfo' },
      {
        $match: {
          'userInfo.isOnboarded': true,
          'userInfo.isBanned': { $ne: true },
        },
      },
      {
        $project: {
          _id: 0,
          userId: '$_id',
          username: '$userInfo.username',
          displayName: '$userInfo.displayName',
          profilePicture: '$userInfo.profilePicture',
          totalPoints: '$userInfo.totalPoints',
          duration: '$totalDuration',
        },
      },
    ]);

    const leaderboard = aggregated.map((entry, index) => ({
      rank: index + 1,
      userId: entry.userId,
      username: entry.username,
      displayName: entry.displayName,
      profilePicture: entry.profilePicture,
      totalPoints: entry.totalPoints || 0,
      league: getLeague(entry.totalPoints || 0),
      durationSeconds: entry.duration,
      focusTime: formatDuration(entry.duration),
    }));

    // Calculate current user's focus rank if authenticated
    let currentUserRank = null;
    if (req.user) {
      const currentUserId = req.user._id.toString();
      const inTopList = leaderboard.find(e => e.userId.toString() === currentUserId);

      if (inTopList) {
        currentUserRank = { ...inTopList };
      } else {
        // User's own focus duration in this window
        const userFocusAgg = await FocusSession.aggregate([
          { $match: { ...matchStage, user: req.user._id } },
          { $group: { _id: '$user', duration: { $sum: '$duration' } } },
        ]);
        const userDuration = userFocusAgg[0]?.duration || 0;

        const higherAgg = await FocusSession.aggregate([
          { $match: matchStage },
          { $group: { _id: '$user', totalDuration: { $sum: '$duration' } } },
          { $match: { totalDuration: { $gt: userDuration } } },
          { $count: 'count' },
        ]);
        const higherCount = higherAgg[0]?.count || 0;

        currentUserRank = {
          rank: higherCount + 1,
          userId: req.user._id,
          username: req.user.username,
          displayName: req.user.displayName,
          profilePicture: req.user.profilePicture,
          totalPoints: req.user.totalPoints || 0,
          league: getLeague(req.user.totalPoints || 0),
          durationSeconds: userDuration,
          focusTime: formatDuration(userDuration),
        };
      }
    }

    res.status(200).json({
      success: true,
      period,
      leaderboard,
      currentUserRank,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getOverallLeaderboard,
  getWeeklyLeaderboard,
  getLeagueLeaderboard,
  getFocusLeaderboard,
};
