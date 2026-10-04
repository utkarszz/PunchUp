const FocusSession = require('../models/FocusSession');
const { getLocalStartOfDay, getLocalStartOfWeek, formatDuration } = require('../utils/dateHelpers');

/**
 * Start a new focus session.
 * Prevents multiple simultaneous active sessions for the same user.
 */
const startSession = async (req, res) => {
  try {
    const userId = req.user._id;
    const timeZone = (req.body.timeZone || 'UTC').trim();

    // Check for existing active session
    const existingActive = await FocusSession.findOne({
      user: userId,
      status: 'active',
    });

    if (existingActive) {
      return res.status(400).json({
        success: false,
        message: 'An active focus session is already running',
        session: existingActive,
      });
    }

    const now = new Date();
    const session = await FocusSession.create({
      user: userId,
      startTime: now,
      status: 'active',
      timeZone,
    });

    res.status(201).json({
      success: true,
      session,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Stop/complete an active focus session.
 * Validates duration server-side to prevent manipulation.
 */
const stopSession = async (req, res) => {
  try {
    const userId = req.user._id;
    const { duration: clientDuration, timeZone = 'UTC' } = req.body;

    const session = await FocusSession.findOne({
      user: userId,
      status: 'active',
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'No active focus session found to stop',
      });
    }

    const now = new Date();
    const serverElapsedSeconds = Math.max(
      0,
      Math.floor((now.getTime() - new Date(session.startTime).getTime()) / 1000)
    );

    let finalDuration = serverElapsedSeconds;

    // Validate clientDuration if provided (e.g. paused periods omitted by client)
    if (typeof clientDuration === 'number') {
      const parsedDuration = Math.floor(clientDuration);
      if (parsedDuration < 0) {
        return res.status(400).json({
          success: false,
          message: 'Duration cannot be negative',
        });
      }
      // Allow clientDuration as long as it does not exceed wall-clock time + 30s network buffer
      if (parsedDuration <= serverElapsedSeconds + 30) {
        finalDuration = parsedDuration;
      } else {
        // Obvious manipulation attempt: clamp to server elapsed
        finalDuration = serverElapsedSeconds;
      }
    }

    session.endTime = now;
    session.duration = finalDuration;
    // Mark completed if at least 5 seconds, otherwise cancelled (accidental start/stop)
    session.status = finalDuration >= 5 ? 'completed' : 'cancelled';
    if (timeZone) {
      session.timeZone = timeZone;
    }
    await session.save();

    // Calculate updated user stats
    const stats = await calculateUserFocusStats(userId, timeZone);

    res.status(200).json({
      success: true,
      session,
      stats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get currently active session for the authenticated user, if any.
 */
const getActiveSession = async (req, res) => {
  try {
    const userId = req.user._id;
    const session = await FocusSession.findOne({
      user: userId,
      status: 'active',
    });

    res.status(200).json({
      success: true,
      activeSession: session || null,
      serverTime: new Date(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get daily, weekly, and overall focus statistics for the authenticated user.
 */
const getFocusStats = async (req, res) => {
  try {
    const userId = req.user._id;
    const timeZone = (req.query.timeZone || 'UTC').trim();

    const stats = await calculateUserFocusStats(userId, timeZone);

    res.status(200).json({
      success: true,
      stats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Helper to compute user's daily, weekly, and overall focus statistics
 */
async function calculateUserFocusStats(userId, timeZone = 'UTC') {
  const startOfDay = getLocalStartOfDay(new Date(), timeZone);
  const startOfWeek = getLocalStartOfWeek(new Date(), timeZone);

  const [dailyResult, weeklyResult, overallResult] = await Promise.all([
    FocusSession.aggregate([
      {
        $match: {
          user: userId,
          status: 'completed',
          startTime: { $gte: startOfDay },
        },
      },
      { $group: { _id: null, total: { $sum: '$duration' } } },
    ]),
    FocusSession.aggregate([
      {
        $match: {
          user: userId,
          status: 'completed',
          startTime: { $gte: startOfWeek },
        },
      },
      { $group: { _id: null, total: { $sum: '$duration' } } },
    ]),
    FocusSession.aggregate([
      {
        $match: {
          user: userId,
          status: 'completed',
        },
      },
      { $group: { _id: null, total: { $sum: '$duration' } } },
    ]),
  ]);

  const dailySeconds = dailyResult[0]?.total || 0;
  const weeklySeconds = weeklyResult[0]?.total || 0;
  const overallSeconds = overallResult[0]?.total || 0;

  return {
    dailySeconds,
    weeklySeconds,
    overallSeconds,
    dailyFormatted: formatDuration(dailySeconds),
    weeklyFormatted: formatDuration(weeklySeconds),
    overallFormatted: formatDuration(overallSeconds),
  };
}

module.exports = {
  startSession,
  stopSession,
  getActiveSession,
  getFocusStats,
};
