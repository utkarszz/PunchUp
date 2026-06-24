const Comment = require("../models/Comment");
const Post = require("../models/Post");
const Notification = require("../models/Notification");

const createComment = async (
  req,
  res
) => {
  try {
    const { content } = req.body;

    const post = await Post.findById(
      req.params.postId
    );

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    const comment =
      await Comment.create({
        post: post._id,
        user: req.user._id,
        content,
      });

    post.commentsCount += 1;

    await post.save();

    // Create notification (if not commenting on own post)
    if (post.user.toString() !== req.user._id.toString()) {
      await Notification.create({
        recipient: post.user,
        sender: req.user._id,
        type: "comment",
        post: post._id,
      });
    }

    res.status(201).json({
      success: true,
      comment,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getComments = async (
  req,
  res
) => {
  try {
    const comments =
      await Comment.find({
        post: req.params.postId,
      })
        .populate(
          "user",
          "username displayName profilePicture"
        )
        .sort({
          createdAt: -1,
        });

    res.status(200).json({
      success: true,
      count: comments.length,
      comments,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const deleteComment = async (
  req,
  res
) => {
  try {
    const comment =
      await Comment.findById(
        req.params.commentId
      );

    if (!comment) {
      return res.status(404).json({
        success: false,
        message:
          "Comment not found",
      });
    }

    if (
      comment.user.toString() !==
      req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Not authorized",
      });
    }

    const post =
      await Post.findById(
        comment.post
      );

    if (post) {
      post.commentsCount =
        Math.max(
          0,
          post.commentsCount - 1
        );

      await post.save();
    }

    await comment.deleteOne();

    res.status(200).json({
      success: true,
      message:
        "Comment deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  createComment,
  getComments,
  deleteComment,
};