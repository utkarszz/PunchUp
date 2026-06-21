const express = require("express");

const protect = require("../middlewares/authMiddleware");

const {
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
} = require("../controllers/followController");

const router = express.Router();

router.post(
  "/:username",
  protect,
  followUser
);

router.delete(
  "/:username",
  protect,
  unfollowUser
);

router.get(
  "/followers/:username",
  getFollowers
);

router.get(
  "/following/:username",
  getFollowing
);

module.exports = router;