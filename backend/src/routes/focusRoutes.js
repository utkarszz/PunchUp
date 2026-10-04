const express = require('express');
const router = express.Router();
const protect = require('../middlewares/authMiddleware');
const {
  startSession,
  stopSession,
  getActiveSession,
  getFocusStats,
} = require('../controllers/focusController');

// All focus session routes are protected
router.post('/start', protect, startSession);
router.post('/stop', protect, stopSession);
router.get('/active', protect, getActiveSession);
router.get('/stats', protect, getFocusStats);

module.exports = router;
