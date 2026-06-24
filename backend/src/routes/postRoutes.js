const express = require("express");

const protect = require("../middlewares/authMiddleware");

const {
  createPost,
  getPosts,
  getFeed,
  getPostById,
  getUserPosts,
  updatePost,
  deletePost,
  toggleLike,
  savePost,
  unsavePost,
  getSavedPosts,
} = require("../controllers/postController");

const router = express.Router();

// Base routes
router.get("/", getPosts);
router.get("/feed", protect, getFeed);
router.get("/saved", protect, getSavedPosts);

// User and specific posts
router.get("/user/:username", getUserPosts);
router.get("/:id", getPostById);

// Actions
router.post("/", protect, createPost);
router.put("/:id", protect, updatePost);
router.delete("/:id", protect, deletePost);
router.post("/:id/like", protect, toggleLike);

// Save / Unsave actions
router.post("/:id/save", protect, savePost);
router.delete("/:id/save", protect, unsavePost);

module.exports = router;
