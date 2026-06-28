const express = require("express");

const protect = require("../middlewares/authMiddleware");


const {
  getMyProfile,
  updateProfile,
  getUserProfile,
  searchUsers,
  getSuggestions,
  checkUsername,
  deleteAccount,
} = require("../controllers/userController");

const router = express.Router();

router.get("/me", protect, getMyProfile);

router.put("/me", protect, updateProfile);
router.delete("/me", protect, deleteAccount);
router.get(
  "/check-username/:username",
  checkUsername
);
router.get(
  "/search",
  searchUsers
);
router.get(
  "/suggestions",
  protect,
  getSuggestions
);

router.get("/:username", getUserProfile);




module.exports = router;