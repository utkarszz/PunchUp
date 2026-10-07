const Comment = require("../models/Comment");
const Post = require("../models/Post");
const Notification = require("../models/Notification");
const { resolveAndVerifyMentions, notifyMentions } = require("../utils/mentionHelper");

const createComment = async (req, res) => {
  try {
    const { content, parentCommentId, mentions } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: "Comment content is required",
      });
    }

    const post = await Post.findById(req.params.postId);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    let parentComment = null;
    if (parentCommentId) {
      parentComment = await Comment.findById(parentCommentId);
      if (!parentComment) {
        return res.status(404).json({
          success: false,
          message: "Parent comment not found",
        });
      }
      if (parentComment.post.toString() !== post._id.toString()) {
        return res.status(400).json({
          success: false,
          message: "Parent comment does not belong to this post",
        });
      }
    }

    const mentionedUsers = await resolveAndVerifyMentions(
      content,
      mentions,
      req.user._id
    );

    const comment = await Comment.create({
      post: post._id,
      user: req.user._id,
      content: content.trim(),
      parentComment: parentComment ? parentComment._id : null,
      likes: [],
      mentions: mentionedUsers.map((u) => u._id),
    });

    post.commentsCount = (post.commentsCount || 0) + 1;
    await post.save();

    // Populate user and mentions before responding
    await comment.populate("user", "username displayName profilePicture totalPoints");
    await comment.populate("mentions", "username displayName profilePicture");
    if (parentComment) {
      await comment.populate({
        path: "parentComment",
        select: "_id user",
        populate: {
          path: "user",
          select: "username displayName",
        },
      });
    }

    // Notifications
    if (parentComment) {
      // Replying to a comment/reply: notify parent comment author (if not self)
      const parentAuthorIdStr = parentComment.user.toString();
      const currentUserIdStr = req.user._id.toString();

      if (parentAuthorIdStr !== currentUserIdStr) {
        await Notification.create({
          recipient: parentComment.user,
          sender: req.user._id,
          type: "comment_reply",
          post: post._id,
          comment: comment._id,
          message: `${req.user.displayName || req.user.username} replied to your comment.`,
        });
      }

      // Notify mentioned users (excluding parent author and self to avoid duplicate notifications)
      if (mentionedUsers.length > 0) {
        await notifyMentions({
          sender: req.user,
          mentionedUsers,
          type: "mention_reply",
          post: post._id,
          comment: comment._id,
          excludeUserIds: [parentAuthorIdStr, currentUserIdStr],
        });
      }
    } else {
      // Top-level comment: notify post author (if not commenting on own post)
      const postAuthorIdStr = post.user.toString();
      const currentUserIdStr = req.user._id.toString();

      if (postAuthorIdStr !== currentUserIdStr) {
        await Notification.create({
          recipient: post.user,
          sender: req.user._id,
          type: "comment",
          post: post._id,
          comment: comment._id,
        });
      }

      // Notify mentioned users (excluding post author and self to avoid duplicate notifications)
      if (mentionedUsers.length > 0) {
        await notifyMentions({
          sender: req.user,
          mentionedUsers,
          type: "mention_comment",
          post: post._id,
          comment: comment._id,
          excludeUserIds: [postAuthorIdStr, currentUserIdStr],
        });
      }
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

const getComments = async (req, res) => {
  try {
    const comments = await Comment.find({
      post: req.params.postId,
    })
      .populate("user", "username displayName profilePicture totalPoints")
      .populate("mentions", "username displayName profilePicture")
      .populate({
        path: "parentComment",
        select: "_id user",
        populate: {
          path: "user",
          select: "username displayName",
        },
      })
      .sort({
        createdAt: 1,
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

const toggleCommentLike = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.commentId);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found",
      });
    }

    if (!comment.likes) {
      comment.likes = [];
    }

    const userIdStr = req.user._id.toString();
    const alreadyLiked = comment.likes.some(
      (id) => id.toString() === userIdStr
    );

    if (alreadyLiked) {
      comment.likes = comment.likes.filter(
        (id) => id.toString() !== userIdStr
      );
    } else {
      comment.likes.push(req.user._id);
    }

    await comment.save();

    // Trigger Notification for Comment Like (if newly liked and not own comment)
    if (!alreadyLiked && comment.user.toString() !== userIdStr) {
      await Notification.create({
        recipient: comment.user,
        sender: req.user._id,
        type: "comment_like",
        post: comment.post,
        comment: comment._id,
        message: `${req.user.displayName || req.user.username} liked your comment.`,
      });
    }

    res.status(200).json({
      success: true,
      liked: !alreadyLiked,
      likesCount: comment.likes.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const deleteComment = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.commentId);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found",
      });
    }

    const post = await Post.findById(comment.post);

    const isCommentAuthor =
      comment.user.toString() === req.user._id.toString();

    const isPostAuthor =
      post && post.user.toString() === req.user._id.toString();

    if (!isCommentAuthor && !isPostAuthor) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this comment",
      });
    }

    // Gather all descendants recursively/iteratively so multi-level nested replies are fully cleaned up
    const allDescendantIds = [];
    const queue = [comment._id];

    while (queue.length > 0) {
      const currentParentId = queue.shift();
      const children = await Comment.find({ parentComment: currentParentId }).select("_id");
      for (const child of children) {
        allDescendantIds.push(child._id);
        queue.push(child._id);
      }
    }

    if (allDescendantIds.length > 0) {
      await Comment.deleteMany({ _id: { $in: allDescendantIds } });
    }

    await comment.deleteOne();

    const totalDeleted = 1 + allDescendantIds.length;
    if (post) {
      post.commentsCount = Math.max(0, (post.commentsCount || 0) - totalDeleted);
      await post.save();
    }

    res.status(200).json({
      success: true,
      message: "Comment deleted successfully",
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
  toggleCommentLike,
  deleteComment,
};