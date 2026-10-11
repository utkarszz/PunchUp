const express = require('express');
const router = express.Router();
const protect = require('../middlewares/authMiddleware');
const {
  getOverallLeaderboard,
  getWeeklyLeaderboard,
  getLeagueLeaderboard,
  getFocusLeaderboard,
} = require('../controllers/leaderboardController');

router.get('/overall', protect.optional, getOverallLeaderboard);
router.get('/weekly', protect.optional, getWeeklyLeaderboard);
router.get('/league/:league', protect.optional, getLeagueLeaderboard);
router.get('/focus', protect.optional, getFocusLeaderboard);

module.exports = router;
