const express = require('express');
const router = express.Router();
const protect = require('../middlewares/authMiddleware');
const {
  getOverallLeaderboard,
  getWeeklyLeaderboard,
  getLeagueLeaderboard,
} = require('../controllers/leaderboardController');

router.get('/overall', protect, getOverallLeaderboard);
router.get('/weekly', protect, getWeeklyLeaderboard);
router.get('/league/:league', protect, getLeagueLeaderboard);

module.exports = router;
