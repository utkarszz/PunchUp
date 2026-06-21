const express = require("express");

const protect = require("../middlewares/authMiddleware");

const {
  createComment,
  getComments,
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

router.delete(
  "/:commentId",
  protect,
  deleteComment
);

module.exports = router;