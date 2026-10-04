const express = require('express');
const router = express.Router();
const protect = require('../middlewares/authMiddleware');
const {
  getOverallLeaderboard,
  getWeeklyLeaderboard,
  getLeagueLeaderboard,
  getFocusLeaderboard,
} = require('../controllers/leaderboardController');

router.get('/overall', protect, getOverallLeaderboard);
router.get('/weekly', protect, getWeeklyLeaderboard);
router.get('/league/:league', protect, getLeagueLeaderboard);
router.get('/focus', protect, getFocusLeaderboard);

module.exports = router;
