const express = require("express");

const protect = require("../middlewares/authMiddleware");

const {
  getMyProfile,
  updateProfile,
} = require("../controllers/userController");

const router = express.Router();

router.get("/me", protect, getMyProfile);

router.put("/me", protect, updateProfile);

module.exports = router;