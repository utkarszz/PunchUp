const { createComment, toggleCommentLike, deleteComment } = require('../src/controllers/commentController');
const Post = require('../src/models/Post');
const Comment = require('../src/models/Comment');
const User = require('../src/models/User');
const Notification = require('../src/models/Notification');

describe('Comment Operations: Replies, Permissions, Deletion & Likes Regression Tests', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Comment replies', () => {
    it('creates a reply to an existing comment and updates post commentCount', async () => {
      const postId = '507f1f77bcf86cd799439011';
      const parentCommentId = '507f1f77bcf86cd799439022';
      const authorId = '507f1f77bcf86cd799439033';
      const replierId = '507f1f77bcf86cd799439044';

      const mockPost = {
        _id: postId,
        commentsCount: 1,
        save: jest.fn().mockResolvedValue(true),
      };
      jest.spyOn(Post, 'findById').mockResolvedValue(mockPost);

      const mockParentComment = {
        _id: parentCommentId,
        post: postId,
        user: authorId,
      };
      jest.spyOn(Comment, 'findById').mockResolvedValue(mockParentComment);

      const mockCreatedReply = {
        _id: '507f1f77bcf86cd799439055',
        post: postId,
        user: replierId,
        content: 'This is a valid reply',
        parentComment: parentCommentId,
        likes: [],
        populate: jest.fn().mockResolvedValue(true),
      };
      jest.spyOn(Comment, 'create').mockResolvedValue(mockCreatedReply);
      const notifCreateSpy = jest.spyOn(Notification, 'create').mockResolvedValue({});

      const req = {
        params: { postId },
        body: { content: 'This is a valid reply', parentCommentId },
        user: { _id: replierId, username: 'replier', displayName: 'Replier' },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await createComment(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(Comment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          post: postId,
          user: replierId,
          content: 'This is a valid reply',
          parentComment: parentCommentId,
        })
      );
      expect(mockPost.commentsCount).toBe(2);
      expect(mockPost.save).toHaveBeenCalled();
      expect(notifCreateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          recipient: authorId,
          type: 'comment_reply',
          post: postId,
        })
      );
    });

    it('returns 400 when reply content is empty or whitespace', async () => {
      const req = {
        params: { postId: '507f1f77bcf86cd799439011' },
        body: { content: '   ', parentCommentId: '507f1f77bcf86cd799439022' },
        user: { _id: '507f1f77bcf86cd799439044' },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await createComment(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Comment content is required',
        })
      );
    });

    it('returns 404 when parent comment does not exist', async () => {
      jest.spyOn(Post, 'findById').mockResolvedValue({ _id: '507f1f77bcf86cd799439011' });
      jest.spyOn(Comment, 'findById').mockResolvedValue(null);

      const req = {
        params: { postId: '507f1f77bcf86cd799439011' },
        body: { content: 'Replying to ghost', parentCommentId: '507f1f77bcf86cd799439099' },
        user: { _id: '507f1f77bcf86cd799439044' },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await createComment(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Parent comment not found',
        })
      );
    });

    it('returns 400 when parent comment belongs to a different post', async () => {
      jest.spyOn(Post, 'findById').mockResolvedValue({ _id: '507f1f77bcf86cd799439011' });
      jest.spyOn(Comment, 'findById').mockResolvedValue({
        _id: '507f1f77bcf86cd799439022',
        post: '507f1f77bcf86cd799439888', // different post
        user: '507f1f77bcf86cd799439033',
      });

      const req = {
        params: { postId: '507f1f77bcf86cd799439011' },
        body: { content: 'Wrong post reply', parentCommentId: '507f1f77bcf86cd799439022' },
        user: { _id: '507f1f77bcf86cd799439044' },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await createComment(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Parent comment does not belong to this post',
        })
      );
    });
  });

  describe('Comment deletion and authorization', () => {
    it('allows comment author to delete their comment and cascades to child replies', async () => {
      const commentId = '507f1f77bcf86cd799439001';
      const childReplyId = '507f1f77bcf86cd799439002';
      const authorId = '507f1f77bcf86cd7994390aa';
      const postAuthorId = '507f1f77bcf86cd7994390bb';
      const postId = '507f1f77bcf86cd799439011';

      const mockComment = {
        _id: commentId,
        post: postId,
        user: authorId,
        deleteOne: jest.fn().mockResolvedValue(true),
      };
      jest.spyOn(Comment, 'findById').mockResolvedValue(mockComment);

      const mockPost = {
        _id: postId,
        user: postAuthorId,
        commentsCount: 3,
        save: jest.fn().mockResolvedValue(true),
      };
      jest.spyOn(Post, 'findById').mockResolvedValue(mockPost);

      jest.spyOn(Comment, 'find')
        .mockReturnValueOnce({ select: jest.fn().mockResolvedValue([{ _id: childReplyId }]) })
        .mockReturnValueOnce({ select: jest.fn().mockResolvedValue([]) });

      const deleteManySpy = jest.spyOn(Comment, 'deleteMany').mockResolvedValue({ deletedCount: 1 });

      const req = {
        params: { commentId },
        user: { _id: authorId, role: 'user', email: 'author@test.com' },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await deleteComment(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(deleteManySpy).toHaveBeenCalledWith({ _id: { $in: [childReplyId] } });
      expect(mockComment.deleteOne).toHaveBeenCalled();
      expect(mockPost.commentsCount).toBe(1); // 3 - 2 = 1
      expect(mockPost.save).toHaveBeenCalled();
    });

    it('allows post author to delete any comment on their post', async () => {
      const commentId = '507f1f77bcf86cd799439001';
      const commentAuthorId = '507f1f77bcf86cd7994390aa';
      const postAuthorId = '507f1f77bcf86cd7994390bb';
      const postId = '507f1f77bcf86cd799439011';

      const mockComment = {
        _id: commentId,
        post: postId,
        user: commentAuthorId,
        deleteOne: jest.fn().mockResolvedValue(true),
      };
      jest.spyOn(Comment, 'findById').mockResolvedValue(mockComment);

      const mockPost = {
        _id: postId,
        user: postAuthorId,
        commentsCount: 1,
        save: jest.fn().mockResolvedValue(true),
      };
      jest.spyOn(Post, 'findById').mockResolvedValue(mockPost);

      jest.spyOn(Comment, 'find').mockReturnValue({ select: jest.fn().mockResolvedValue([]) });

      const req = {
        params: { commentId },
        user: { _id: postAuthorId, role: 'user', email: 'postauthor@test.com' },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await deleteComment(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(mockComment.deleteOne).toHaveBeenCalled();
      expect(mockPost.commentsCount).toBe(0);
    });

    it('allows platform admin to delete comment', async () => {
      const commentId = '507f1f77bcf86cd799439001';
      const commentAuthorId = '507f1f77bcf86cd7994390aa';
      const postAuthorId = '507f1f77bcf86cd7994390bb';
      const adminId = '507f1f77bcf86cd7994390cc';
      const postId = '507f1f77bcf86cd799439011';

      const mockComment = {
        _id: commentId,
        post: postId,
        user: commentAuthorId,
        deleteOne: jest.fn().mockResolvedValue(true),
      };
      jest.spyOn(Comment, 'findById').mockResolvedValue(mockComment);

      const mockPost = {
        _id: postId,
        user: postAuthorId,
        commentsCount: 1,
        save: jest.fn().mockResolvedValue(true),
      };
      jest.spyOn(Post, 'findById').mockResolvedValue(mockPost);
      jest.spyOn(Comment, 'find').mockReturnValue({ select: jest.fn().mockResolvedValue([]) });

      const req = {
        params: { commentId },
        user: { _id: adminId, role: 'admin', email: 'admin@test.com' },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await deleteComment(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(mockComment.deleteOne).toHaveBeenCalled();
    });

    it('rejects deletion with 403 when an unrelated user attempts to delete a comment', async () => {
      const commentId = '507f1f77bcf86cd799439001';
      const commentAuthorId = '507f1f77bcf86cd7994390aa';
      const postAuthorId = '507f1f77bcf86cd7994390bb';
      const attackerId = '507f1f77bcf86cd7994390dd';
      const postId = '507f1f77bcf86cd799439011';

      const mockComment = {
        _id: commentId,
        post: postId,
        user: commentAuthorId,
        deleteOne: jest.fn(),
      };
      jest.spyOn(Comment, 'findById').mockResolvedValue(mockComment);

      const mockPost = {
        _id: postId,
        user: postAuthorId,
      };
      jest.spyOn(Post, 'findById').mockResolvedValue(mockPost);

      const req = {
        params: { commentId },
        user: { _id: attackerId, role: 'user', email: 'attacker@test.com' },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await deleteComment(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Not authorized to delete this comment',
        })
      );
      expect(mockComment.deleteOne).not.toHaveBeenCalled();
    });

    it('returns 404 when deleting a non-existent comment', async () => {
      jest.spyOn(Comment, 'findById').mockResolvedValue(null);

      const req = {
        params: { commentId: '507f1f77bcf86cd799439099' },
        user: { _id: '507f1f77bcf86cd7994390aa', role: 'user' },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await deleteComment(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Comment not found',
        })
      );
    });
  });

  describe('Comment likes and atomic updates', () => {
    it('likes a comment atomically using $addToSet and creates a notification', async () => {
      const commentId = '507f1f77bcf86cd799439001';
      const commentAuthorId = '507f1f77bcf86cd7994390aa';
      const likerId = '507f1f77bcf86cd7994390bb';

      const mockComment = {
        _id: commentId,
        post: '507f1f77bcf86cd799439011',
        user: commentAuthorId,
        likes: [],
      };
      jest.spyOn(Comment, 'findById').mockResolvedValue(mockComment);

      const updatedComment = {
        _id: commentId,
        likes: [likerId],
      };
      const updateSpy = jest.spyOn(Comment, 'findByIdAndUpdate').mockResolvedValue(updatedComment);
      jest.spyOn(Notification, 'findOne').mockResolvedValue(null);
      const notifCreateSpy = jest.spyOn(Notification, 'create').mockResolvedValue({});

      const req = {
        params: { commentId },
        user: { _id: likerId, username: 'liker', displayName: 'Liker' },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await toggleCommentLike(req, res);

      expect(updateSpy).toHaveBeenCalledWith(
        commentId,
        { $addToSet: { likes: likerId } },
        { new: true }
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        liked: true,
        likesCount: 1,
      });
      expect(notifCreateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          recipient: commentAuthorId,
          type: 'comment_like',
          comment: commentId,
        })
      );
    });

    it('unlikes a comment atomically using $pull', async () => {
      const commentId = '507f1f77bcf86cd799439001';
      const commentAuthorId = '507f1f77bcf86cd7994390aa';
      const likerId = '507f1f77bcf86cd7994390bb';

      const mockComment = {
        _id: commentId,
        post: '507f1f77bcf86cd799439011',
        user: commentAuthorId,
        likes: [likerId],
      };
      jest.spyOn(Comment, 'findById').mockResolvedValue(mockComment);

      const updatedComment = {
        _id: commentId,
        likes: [],
      };
      const updateSpy = jest.spyOn(Comment, 'findByIdAndUpdate').mockResolvedValue(updatedComment);
      const notifCreateSpy = jest.spyOn(Notification, 'create').mockResolvedValue({});

      const req = {
        params: { commentId },
        user: { _id: likerId, username: 'liker', displayName: 'Liker' },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await toggleCommentLike(req, res);

      expect(updateSpy).toHaveBeenCalledWith(
        commentId,
        { $pull: { likes: likerId } },
        { new: true }
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        liked: false,
        likesCount: 0,
      });
      expect(notifCreateSpy).not.toHaveBeenCalled();
    });

    it('does not create duplicate notification if a like notification already exists', async () => {
      const commentId = '507f1f77bcf86cd799439001';
      const commentAuthorId = '507f1f77bcf86cd7994390aa';
      const likerId = '507f1f77bcf86cd7994390bb';

      const mockComment = {
        _id: commentId,
        post: '507f1f77bcf86cd799439011',
        user: commentAuthorId,
        likes: [],
      };
      jest.spyOn(Comment, 'findById').mockResolvedValue(mockComment);

      const updatedComment = {
        _id: commentId,
        likes: [likerId],
      };
      jest.spyOn(Comment, 'findByIdAndUpdate').mockResolvedValue(updatedComment);
      jest.spyOn(Notification, 'findOne').mockResolvedValue({ _id: 'notif123' }); // already exists
      const notifCreateSpy = jest.spyOn(Notification, 'create');

      const req = {
        params: { commentId },
        user: { _id: likerId, username: 'liker', displayName: 'Liker' },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await toggleCommentLike(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(notifCreateSpy).not.toHaveBeenCalled();
    });

    it('does not send notification when liking own comment', async () => {
      const commentId = '507f1f77bcf86cd799439001';
      const authorId = '507f1f77bcf86cd7994390aa';

      const mockComment = {
        _id: commentId,
        post: '507f1f77bcf86cd799439011',
        user: authorId,
        likes: [],
      };
      jest.spyOn(Comment, 'findById').mockResolvedValue(mockComment);

      const updatedComment = {
        _id: commentId,
        likes: [authorId],
      };
      jest.spyOn(Comment, 'findByIdAndUpdate').mockResolvedValue(updatedComment);
      const notifCreateSpy = jest.spyOn(Notification, 'create');

      const req = {
        params: { commentId },
        user: { _id: authorId, username: 'author', displayName: 'Author' },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await toggleCommentLike(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(notifCreateSpy).not.toHaveBeenCalled();
    });

    it('returns 404 when liking a non-existent comment', async () => {
      jest.spyOn(Comment, 'findById').mockResolvedValue(null);

      const req = {
        params: { commentId: '507f1f77bcf86cd799439099' },
        user: { _id: '507f1f77bcf86cd7994390bb' },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await toggleCommentLike(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Comment not found',
        })
      );
    });
  });
});
