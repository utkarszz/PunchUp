const { createComment, toggleCommentLike } = require('../src/controllers/commentController');
const { startSession, stopSession, getFocusStats } = require('../src/controllers/focusController');
const { getFocusLeaderboard } = require('../src/controllers/leaderboardController');
const { getPostById } = require('../src/controllers/postController');
const Comment = require('../src/models/Comment');
const Post = require('../src/models/Post');
const Notification = require('../src/models/Notification');
const FocusSession = require('../src/models/FocusSession');

describe('PunchUp V3 Backend Features', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('1 & 2. Comment Replies and Notifications', () => {
    it('creates a reply to an existing comment and sends notification to parent comment author', async () => {
      const mockPostId = '507f1f77bcf86cd799439011';
      const mockParentCommentId = '507f1f77bcf86cd799439022';
      const userAId = '507f1f77bcf86cd7994390aa';
      const userBId = '507f1f77bcf86cd7994390bb';

      const mockPost = {
        _id: mockPostId,
        commentsCount: 1,
        save: jest.fn().mockResolvedValue(true),
      };
      jest.spyOn(Post, 'findById').mockResolvedValue(mockPost);

      const mockParentComment = {
        _id: mockParentCommentId,
        post: mockPostId,
        user: userAId,
      };
      jest.spyOn(Comment, 'findById').mockResolvedValue(mockParentComment);

      const mockCreatedComment = {
        _id: '507f1f77bcf86cd799439033',
        post: mockPostId,
        user: userBId,
        content: 'Thanks bro!',
        parentComment: mockParentCommentId,
        likes: [],
        populate: jest.fn().mockResolvedValue(true),
      };
      jest.spyOn(Comment, 'create').mockResolvedValue(mockCreatedComment);
      const notifCreateSpy = jest.spyOn(Notification, 'create').mockResolvedValue({});

      const req = {
        params: { postId: mockPostId },
        body: { content: 'Thanks bro!', parentCommentId: mockParentCommentId },
        user: { _id: userBId, username: 'userB', displayName: 'User B' },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await createComment(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(Comment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          parentComment: mockParentCommentId,
          content: 'Thanks bro!',
        })
      );
      // Notification sent to User A (parent author) with type comment_reply
      expect(notifCreateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          recipient: userAId,
          sender: userBId,
          type: 'comment_reply',
        })
      );
    });

    it('does NOT send notification when user replies to their own comment', async () => {
      const mockPostId = '507f1f77bcf86cd799439011';
      const mockParentCommentId = '507f1f77bcf86cd799439022';
      const userAId = '507f1f77bcf86cd7994390aa';

      const mockPost = {
        _id: mockPostId,
        commentsCount: 1,
        save: jest.fn().mockResolvedValue(true),
      };
      jest.spyOn(Post, 'findById').mockResolvedValue(mockPost);

      const mockParentComment = {
        _id: mockParentCommentId,
        post: mockPostId,
        user: userAId,
      };
      jest.spyOn(Comment, 'findById').mockResolvedValue(mockParentComment);

      const mockCreatedComment = {
        _id: '507f1f77bcf86cd799439033',
        populate: jest.fn().mockResolvedValue(true),
      };
      jest.spyOn(Comment, 'create').mockResolvedValue(mockCreatedComment);
      const notifCreateSpy = jest.spyOn(Notification, 'create').mockResolvedValue({});

      const req = {
        params: { postId: mockPostId },
        body: { content: 'Self reply', parentCommentId: mockParentCommentId },
        user: { _id: userAId, username: 'userA' },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await createComment(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(notifCreateSpy).not.toHaveBeenCalled();
    });

    it('rejects reply if parent comment does not belong to the post', async () => {
      const mockPostId = '507f1f77bcf86cd799439011';
      const otherPostId = '507f1f77bcf86cd799439999';

      jest.spyOn(Post, 'findById').mockResolvedValue({ _id: mockPostId });
      jest.spyOn(Comment, 'findById').mockResolvedValue({
        _id: 'parent_id',
        post: otherPostId,
        user: 'someone',
      });

      const req = {
        params: { postId: mockPostId },
        body: { content: 'Invalid', parentCommentId: 'parent_id' },
        user: { _id: 'user_b' },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await createComment(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false })
      );
    });
  });

  describe('3. Comment Likes', () => {
    it('toggles like from unliked to liked and sends notification', async () => {
      const commentAuthorId = 'author_123';
      const likerId = 'liker_456';
      const mockComment = {
        _id: 'comment_1',
        post: 'post_1',
        user: commentAuthorId,
        likes: [],
        save: jest.fn().mockResolvedValue(true),
      };
      jest.spyOn(Comment, 'findById').mockResolvedValue(mockComment);
      const notifCreateSpy = jest.spyOn(Notification, 'create').mockResolvedValue({});

      const req = {
        params: { commentId: 'comment_1' },
        user: { _id: likerId, displayName: 'Liker' },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await toggleCommentLike(req, res);

      expect(mockComment.likes).toContain(likerId);
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
        })
      );
    });

    it('toggles like from liked to unliked and does NOT send notification', async () => {
      const commentAuthorId = 'author_123';
      const likerId = 'liker_456';
      const mockComment = {
        _id: 'comment_1',
        post: 'post_1',
        user: commentAuthorId,
        likes: [likerId],
        save: jest.fn().mockResolvedValue(true),
      };
      jest.spyOn(Comment, 'findById').mockResolvedValue(mockComment);
      const notifCreateSpy = jest.spyOn(Notification, 'create').mockResolvedValue({});

      const req = {
        params: { commentId: 'comment_1' },
        user: { _id: likerId, displayName: 'Liker' },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await toggleCommentLike(req, res);

      expect(mockComment.likes.length).toBe(0);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        liked: false,
        likesCount: 0,
      });
      expect(notifCreateSpy).not.toHaveBeenCalled();
    });

    it('does not send notification when user likes their own comment', async () => {
      const userId = 'user_same';
      const mockComment = {
        _id: 'comment_1',
        post: 'post_1',
        user: userId,
        likes: [],
        save: jest.fn().mockResolvedValue(true),
      };
      jest.spyOn(Comment, 'findById').mockResolvedValue(mockComment);
      const notifCreateSpy = jest.spyOn(Notification, 'create').mockResolvedValue({});

      const req = {
        params: { commentId: 'comment_1' },
        user: { _id: userId },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await toggleCommentLike(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(notifCreateSpy).not.toHaveBeenCalled();
    });
  });

  describe('9, 10, 11, 12. Focus Timer Backend & Security', () => {
    it('prevents creating multiple simultaneous active focus sessions', async () => {
      const userId = 'user_focus_1';
      const existingActive = { _id: 'sess_1', status: 'active' };
      jest.spyOn(FocusSession, 'findOne').mockResolvedValue(existingActive);

      const req = { user: { _id: userId }, body: {} };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await startSession(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringContaining('already running'),
        })
      );
    });

    it('starts a new focus session when no active session exists', async () => {
      const userId = 'user_focus_1';
      jest.spyOn(FocusSession, 'findOne').mockResolvedValue(null);
      jest.spyOn(FocusSession, 'create').mockResolvedValue({
        _id: 'sess_new',
        user: userId,
        status: 'active',
      });

      const req = { user: { _id: userId }, body: { timeZone: 'Asia/Kolkata' } };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await startSession(req, res);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });

    it('rejects negative duration manipulation', async () => {
      const userId = 'user_focus_1';
      const activeSession = {
        _id: 'sess_1',
        startTime: new Date(Date.now() - 60000),
        status: 'active',
      };
      jest.spyOn(FocusSession, 'findOne').mockResolvedValue(activeSession);

      const req = { user: { _id: userId }, body: { duration: -50 } };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await stopSession(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Duration cannot be negative',
        })
      );
    });
  });

  describe('4. Post Sharing & Public-Safe References', () => {
    it('finds post by public shareId', async () => {
      const mockPost = {
        _id: '507f1f77bcf86cd799439011',
        shareId: 'p_8a9b0c1d',
        content: 'Sharing progress!',
        populate: jest.fn().mockReturnThis(),
      };
      jest.spyOn(Post, 'findOne').mockImplementation((query) => {
        if (query.shareId === 'p_8a9b0c1d') {
          return {
            populate: jest.fn().mockResolvedValue(mockPost),
          };
        }
        return { populate: jest.fn().mockResolvedValue(null) };
      });

      const req = { params: { id: 'p_8a9b0c1d' } };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await getPostById(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          post: expect.objectContaining({ shareId: 'p_8a9b0c1d' }),
        })
      );
    });
  });
});
