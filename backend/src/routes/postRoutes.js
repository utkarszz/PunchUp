const express = require("express");

const protect = require("../middlewares/authMiddleware");

const {
  createPost,
  getPosts,
  getPostById,
  getUserPosts,
  updatePost,
  deletePost,
  toggleLike,
} = require("../controllers/postController");

const router = express.Router();

router.get("/", getPosts);

router.get(
  "/user/:username",
  getUserPosts
);

router.get(
  "/:id",
  getPostById
);

router.post(
  "/",
  protect,
  createPost
);

router.put(
  "/:id",
  protect,
  updatePost
);

router.delete(
  "/:id",
  protect,
  deletePost
);

router.post(
  "/:id/like",
  protect,
  toggleLike
);

module.exports = router;
