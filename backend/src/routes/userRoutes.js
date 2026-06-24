const express = require("express");

const protect = require("../middlewares/authMiddleware");


const {
  getMyProfile,
  updateProfile,
  getUserProfile,
  searchUsers,
  checkUsername,
 
} = require("../controllers/userController");

const router = express.Router();

router.get("/me", protect, getMyProfile);

router.put("/me", protect, updateProfile);
router.get(
  "/check-username/:username",
  checkUsername
);
router.get(
  "/search",
  searchUsers
);

router.get("/:username", getUserProfile);



module.exports = router;