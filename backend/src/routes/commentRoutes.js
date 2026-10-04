const express = require("express");

const protect = require("../middlewares/authMiddleware");

const {
  createComment,
  getComments,
  toggleCommentLike,
  deleteComment,
} = require("../controllers/commentController");

const router = express.Router();

router.post(
  "/:postId",
  protect,
  createComment
);

router.get(
  "/:postId",
  getComments
);

router.post(
  "/:commentId/like",
  protect,
  toggleCommentLike
);

router.delete(
  "/:commentId",
  protect,
  deleteComment
);

module.exports = router;