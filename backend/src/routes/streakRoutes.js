const express = require("express");

const protect = require("../middlewares/authMiddleware");

const {
  getStreak,
} = require("../controllers/streakController");

const router = express.Router();

router.get("/", protect, getStreak);

module.exports = router;