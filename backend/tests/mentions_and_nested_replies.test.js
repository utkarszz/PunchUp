const { createPost, updatePost } = require('../src/controllers/postController');
const { createComment, toggleCommentLike, deleteComment } = require('../src/controllers/commentController');
const { searchUsers } = require('../src/controllers/userController');
const { extractMentionUsernames, resolveAndVerifyMentions, notifyMentions } = require('../src/utils/mentionHelper');
const Post = require('../src/models/Post');
const Comment = require('../src/models/Comment');
const User = require('../src/models/User');
const Notification = require('../src/models/Notification');

describe('Community Features: @Mentions and Nested Comment Replies', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('1. @Mention Extraction and Resolution Helper', () => {
    it('extracts unique usernames from text correctly', () => {
      const text = 'Hey @keshav and @parth, look at this! Also cc @keshav again.';
      const usernames = extractMentionUsernames(text);
      expect(usernames).toEqual(['keshav', 'parth']);
    });

    it('resolves and verifies mentioned users while excluding author and non-existent users', async () => {
      const authorId = '507f1f77bcf86cd799439001';
      const keshavId = '507f1f77bcf86cd799439002';
      const mockUsers = [
        { _id: keshavId, username: 'keshav', displayName: 'Keshav G' },
      ];

      jest.spyOn(User, 'find').mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUsers),
      });

      // User mentions keshav and author username
      const text = 'Great job @keshav and @author_self';
      const resolved = await resolveAndVerifyMentions(text, [], authorId);

      expect(resolved).toHaveLength(1);
      expect(resolved[0]._id).toBe(keshavId);
      expect(resolved[0].username).toBe('keshav');
    });

    it('does not send notification when user mentions themselves', async () => {
      const authorId = '507f1f77bcf86cd799439001';
      const mockSelf = [
        { _id: authorId, username: 'author_self', displayName: 'Self' },
      ];

      jest.spyOn(User, 'find').mockReturnValue({
        select: jest.fn().mockResolvedValue(mockSelf),
      });

      const text = 'Self note @author_self';
      const resolved = await resolveAndVerifyMentions(text, [], authorId);
      expect(resolved).toHaveLength(0);
    });

    it('creates only one notification per mentioned user even if mentioned multiple times', async () => {
      const insertManySpy = jest.spyOn(Notification, 'insertMany').mockResolvedValue([]);
      const sender = { _id: '507f1f77bcf86cd799439001', displayName: 'Sender' };
      const keshav = { _id: '507f1f77bcf86cd799439002', username: 'keshav' };

      // Duplicate in list
      await notifyMentions({
        sender,
        mentionedUsers: [keshav, keshav],
        type: 'mention_post',
        post: '507f1f77bcf86cd799439011',
      });

      expect(insertManySpy).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            recipient: keshav._id,
            type: 'mention_post',
          }),
        ])
      );
      // Exactly 1 notification created
      expect(insertManySpy.mock.calls[0][0]).toHaveLength(1);
    });
  });

  describe('2. Live User Search for Mentions', () => {
    it('returns top safe users when query is empty (typing @ alone)', async () => {
      const mockUsers = [
        { username: 'keshav', displayName: 'Keshav G', profilePicture: '', totalPoints: 500 },
        { username: 'parth', displayName: 'Parth S', profilePicture: '', totalPoints: 300 },
      ];

      const selectMock = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue(mockUsers),
        }),
      });

      jest.spyOn(User, 'find').mockReturnValue({
        select: selectMock,
      });

      const req = { query: { q: '' } };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await searchUsers(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          count: 2,
          users: mockUsers,
        })
      );
      expect(User.find).toHaveBeenCalledWith(expect.objectContaining({ isBanned: { $ne: true } }));
    });

    it('filters users by safe regex when query is provided', async () => {
      const selectMock = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue([
            { username: 'keshav', displayName: 'Keshav G', profilePicture: '', totalPoints: 500 },
          ]),
        }),
      });

      jest.spyOn(User, 'find').mockReturnValue({
        select: selectMock,
      });

      const req = { query: { q: 'kes' } };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await searchUsers(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(User.find).toHaveBeenCalledWith(
        expect.objectContaining({
          username: expect.objectContaining({ $regex: 'kes', $options: 'i' }),
        })
      );
    });
  });

  describe('3. Post Creation and Editing with Mentions', () => {
    it('creates post with mention and notifies mentioned user', async () => {
      const authorId = '507f1f77bcf86cd799439001';
      const keshavId = '507f1f77bcf86cd799439002';

      jest.spyOn(User, 'find').mockReturnValue({
        select: jest.fn().mockResolvedValue([
          { _id: keshavId, username: 'keshav', displayName: 'Keshav' },
        ]),
      });

      const mockPost = {
        _id: '507f1f77bcf86cd799439011',
        content: 'Check this out @keshav!',
        user: authorId,
        mentions: [keshavId],
        populate: jest.fn().mockResolvedValue(true),
      };

      jest.spyOn(Post, 'create').mockResolvedValue(mockPost);
      const notifSpy = jest.spyOn(Notification, 'insertMany').mockResolvedValue([]);

      const req = {
        user: { _id: authorId, displayName: 'Author User', username: 'author' },
        body: { content: 'Check this out @keshav!' },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await createPost(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(Post.create).toHaveBeenCalledWith(
        expect.objectContaining({
          mentions: [keshavId],
        })
      );
      expect(notifSpy).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            recipient: keshavId,
            type: 'mention_post',
            post: mockPost._id,
          }),
        ])
      );
    });

    it('editing post notifies only newly mentioned users and updates mentions array', async () => {
      const authorId = '507f1f77bcf86cd799439001';
      const keshavId = '507f1f77bcf86cd799439002';
      const parthId = '507f1f77bcf86cd799439003';

      const existingPost = {
        _id: '507f1f77bcf86cd799439011',
        user: authorId,
        content: 'Hello @keshav',
        mentions: [keshavId],
        save: jest.fn().mockResolvedValue(true),
        populate: jest.fn().mockResolvedValue(true),
      };

      jest.spyOn(Post, 'findById').mockResolvedValue(existingPost);

      // Now user changes text to "Hello @keshav and @parth"
      jest.spyOn(User, 'find').mockReturnValue({
        select: jest.fn().mockResolvedValue([
          { _id: keshavId, username: 'keshav', displayName: 'Keshav' },
          { _id: parthId, username: 'parth', displayName: 'Parth' },
        ]),
      });

      const notifSpy = jest.spyOn(Notification, 'insertMany').mockResolvedValue([]);

      const req = {
        params: { id: existingPost._id },
        user: { _id: authorId, displayName: 'Author', username: 'author' },
        body: { content: 'Hello @keshav and @parth' },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await updatePost(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(existingPost.mentions).toEqual([keshavId, parthId]);
      // Only Parth should receive notification since Keshav was already mentioned
      expect(notifSpy).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            recipient: parthId,
            type: 'mention_post',
          }),
        ])
      );
      expect(notifSpy.mock.calls[0][0]).toHaveLength(1);
    });
  });

  describe('4. Nested Comment Replies and Validation', () => {
    it('creates a root comment with parentComment = null', async () => {
      const postId = '507f1f77bcf86cd799439011';
      const postAuthorId = '507f1f77bcf86cd7994390aa';
      const commenterId = '507f1f77bcf86cd7994390bb';

      jest.spyOn(Post, 'findById').mockResolvedValue({
        _id: postId,
        user: postAuthorId,
        commentsCount: 0,
        save: jest.fn().mockResolvedValue(true),
      });

      jest.spyOn(User, 'find').mockReturnValue({
        select: jest.fn().mockResolvedValue([]),
      });

      const mockComment = {
        _id: '507f1f77bcf86cd799439021',
        post: postId,
        user: commenterId,
        content: 'Root comment here',
        parentComment: null,
        populate: jest.fn().mockResolvedValue(true),
      };
      jest.spyOn(Comment, 'create').mockResolvedValue(mockComment);
      const notifCreateSpy = jest.spyOn(Notification, 'create').mockResolvedValue({});

      const req = {
        params: { postId },
        body: { content: 'Root comment here' },
        user: { _id: commenterId, username: 'userB', displayName: 'User B' },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await createComment(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(Comment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          parentComment: null,
          content: 'Root comment here',
        })
      );
      expect(notifCreateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          recipient: postAuthorId,
          type: 'comment',
        })
      );
    });

    it('creates reply to reply (multi-level nesting) referencing specific parent', async () => {
      const postId = '507f1f77bcf86cd799439011';
      const reply1AuthorId = '507f1f77bcf86cd7994390aa';
      const reply2AuthorId = '507f1f77bcf86cd7994390bb';
      const reply1Id = '507f1f77bcf86cd799439031';

      jest.spyOn(Post, 'findById').mockResolvedValue({
        _id: postId,
        commentsCount: 2,
        save: jest.fn().mockResolvedValue(true),
      });

      jest.spyOn(Comment, 'findById').mockResolvedValue({
        _id: reply1Id,
        post: postId,
        user: reply1AuthorId,
      });

      jest.spyOn(User, 'find').mockReturnValue({
        select: jest.fn().mockResolvedValue([]),
      });

      const mockChildReply = {
        _id: '507f1f77bcf86cd799439032',
        post: postId,
        user: reply2AuthorId,
        content: '@userA exactly!',
        parentComment: reply1Id,
        populate: jest.fn().mockResolvedValue(true),
      };
      jest.spyOn(Comment, 'create').mockResolvedValue(mockChildReply);
      const notifCreateSpy = jest.spyOn(Notification, 'create').mockResolvedValue({});

      const req = {
        params: { postId },
        body: { content: '@userA exactly!', parentCommentId: reply1Id },
        user: { _id: reply2AuthorId, username: 'userB', displayName: 'User B' },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await createComment(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(Comment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          parentComment: reply1Id,
        })
      );
      // Notifies author of the replied-to comment (reply1AuthorId)
      expect(notifCreateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          recipient: reply1AuthorId,
          type: 'comment_reply',
        })
      );
    });

    it('rejects reply when parent comment belongs to a different post', async () => {
      const postId1 = '507f1f77bcf86cd799439011';
      const postId2 = '507f1f77bcf86cd799439099';
      const parentCommentId = '507f1f77bcf86cd799439055';

      jest.spyOn(Post, 'findById').mockResolvedValue({
        _id: postId1,
      });

      jest.spyOn(Comment, 'findById').mockResolvedValue({
        _id: parentCommentId,
        post: postId2, // Different post!
        user: '507f1f77bcf86cd799439088',
      });

      const req = {
        params: { postId: postId1 },
        body: { content: 'Sneaky reply', parentCommentId },
        user: { _id: '507f1f77bcf86cd799439077' },
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

    it('sends mention_reply notification when another user is mentioned in a reply without duplicating parent author notification', async () => {
      const postId = '507f1f77bcf86cd799439011';
      const parentAuthorId = '507f1f77bcf86cd7994390aa';
      const senderId = '507f1f77bcf86cd7994390bb';
      const thirdUserId = '507f1f77bcf86cd7994390cc';
      const parentCommentId = '507f1f77bcf86cd799439055';

      jest.spyOn(Post, 'findById').mockResolvedValue({
        _id: postId,
        commentsCount: 1,
        save: jest.fn().mockResolvedValue(true),
      });

      jest.spyOn(Comment, 'findById').mockResolvedValue({
        _id: parentCommentId,
        post: postId,
        user: parentAuthorId,
      });

      // Mentions both parentAuthor (username "parent") and thirdUser (username "third")
      jest.spyOn(User, 'find').mockReturnValue({
        select: jest.fn().mockResolvedValue([
          { _id: parentAuthorId, username: 'parent', displayName: 'Parent' },
          { _id: thirdUserId, username: 'third', displayName: 'Third' },
        ]),
      });

      const mockComment = {
        _id: '507f1f77bcf86cd799439066',
        post: postId,
        user: senderId,
        content: '@parent and @third take a look',
        parentComment: parentCommentId,
        mentions: [parentAuthorId, thirdUserId],
        populate: jest.fn().mockResolvedValue(true),
      };

      jest.spyOn(Comment, 'create').mockResolvedValue(mockComment);
      const notifCreateSpy = jest.spyOn(Notification, 'create').mockResolvedValue({});
      const notifInsertManySpy = jest.spyOn(Notification, 'insertMany').mockResolvedValue([]);

      const req = {
        params: { postId },
        body: { content: '@parent and @third take a look', parentCommentId },
        user: { _id: senderId, username: 'sender', displayName: 'Sender' },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await createComment(req, res);

      // Parent author receives comment_reply
      expect(notifCreateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          recipient: parentAuthorId,
          type: 'comment_reply',
        })
      );

      // Third user receives mention_reply, but parentAuthor is excluded from mention_reply
      expect(notifInsertManySpy).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            recipient: thirdUserId,
            type: 'mention_reply',
          }),
        ])
      );
      // Only 1 mention notification sent (to third user)
      expect(notifInsertManySpy.mock.calls[0][0]).toHaveLength(1);
    });
  });

  describe('5. Cascading Deletion of Nested Comment Threads', () => {
    it('deletes comment and all child/nested descendant replies recursively', async () => {
      const commentId = '507f1f77bcf86cd799439001';
      const child1Id = '507f1f77bcf86cd799439002';
      const child2Id = '507f1f77bcf86cd799439003';
      const authorId = '507f1f77bcf86cd7994390aa';
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
        user: authorId,
        commentsCount: 5,
        save: jest.fn().mockResolvedValue(true),
      };
      jest.spyOn(Post, 'findById').mockResolvedValue(mockPost);

      // BFS lookup for children: first call returns child1, second returns child2 (grandchild), third returns empty
      jest.spyOn(Comment, 'find')
        .mockReturnValueOnce({ select: jest.fn().mockResolvedValue([{ _id: child1Id }]) })
        .mockReturnValueOnce({ select: jest.fn().mockResolvedValue([{ _id: child2Id }]) })
        .mockReturnValueOnce({ select: jest.fn().mockResolvedValue([]) });

      const deleteManySpy = jest.spyOn(Comment, 'deleteMany').mockResolvedValue({ deletedCount: 2 });

      const req = {
        params: { commentId },
        user: { _id: authorId },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await deleteComment(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(deleteManySpy).toHaveBeenCalledWith({
        _id: { $in: [child1Id, child2Id] },
      });
      expect(mockComment.deleteOne).toHaveBeenCalled();
      // Total deleted = 1 parent + 2 children = 3
      expect(mockPost.commentsCount).toBe(2);
      expect(mockPost.save).toHaveBeenCalled();
    });
  });
});
