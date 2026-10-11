const mongoose = require('mongoose');
const User = require('../src/models/User');
const FocusSession = require('../src/models/FocusSession');
const { getAdminStudyTime } = require('../src/controllers/adminController');
const {
  getOverallLeaderboard,
  getWeeklyLeaderboard,
  getLeagueLeaderboard,
  getFocusLeaderboard,
} = require('../src/controllers/leaderboardController');
const PointEvent = require('../src/models/PointEvent');

describe('Admin Study Time & Leaderboard Current User Rank Tests', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('1. Admin Study Time Aggregation Endpoint', () => {
    it('aggregates completed sessions with today, weekly, and overall durations', async () => {
      const mockResult = [
        {
          metadata: [{ total: 2 }],
          users: [
            {
              _id: new mongoose.Types.ObjectId(),
              username: 'alex',
              displayName: 'Alex Rivers',
              email: 'alex@example.com',
              role: 'user',
              todayDuration: 3600,
              weeklyDuration: 14400,
              overallDuration: 36000,
            },
            {
              _id: new mongoose.Types.ObjectId(),
              username: 'utkarsh',
              displayName: 'Utkarsh',
              email: 'utkarzz1705@gmail.com',
              role: 'user',
              todayDuration: 1800,
              weeklyDuration: 7200,
              overallDuration: 18000,
            },
          ],
        },
      ];

      jest.spyOn(User, 'aggregate').mockResolvedValue(mockResult);

      const req = {
        query: {
          page: '1',
          limit: '10',
          sortBy: 'todayDuration',
          sortOrder: 'desc',
          timeZone: 'UTC',
        },
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await getAdminStudyTime(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const data = res.json.mock.calls[0][0];
      expect(data.success).toBe(true);
      expect(data.users.length).toBe(2);

      // Verify formatted strings
      expect(data.users[0].todayFormatted).toBe('1h');
      expect(data.users[0].weeklyFormatted).toBe('4h');
      expect(data.users[0].overallFormatted).toBe('10h');

      // Verify admin role normalization for primary admin email
      expect(data.users[1].role).toBe('admin');
      expect(data.pagination.total).toBe(2);
      expect(data.pagination.page).toBe(1);
    });
  });

  describe('2. Leaderboard Current User Rank Computation', () => {
    it('returns currentUserRank when user is in the top 50 overall list', async () => {
      const currentUserId = new mongoose.Types.ObjectId();
      const mockUsers = [
        {
          _id: new mongoose.Types.ObjectId(),
          username: 'alice',
          totalPoints: 1000,
        },
        {
          _id: currentUserId,
          username: 'me',
          totalPoints: 500,
        },
      ];

      jest.spyOn(User, 'find').mockReturnValue({
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockUsers),
      });

      const req = {
        user: {
          _id: currentUserId,
          username: 'me',
          totalPoints: 500,
        },
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await getOverallLeaderboard(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const data = res.json.mock.calls[0][0];
      expect(data.currentUserRank).toBeDefined();
      expect(data.currentUserRank.rank).toBe(2);
      expect(data.currentUserRank.username).toBe('me');
    });

    it('accurately computes rank via countDocuments when user is outside top 50', async () => {
      const currentUserId = new mongoose.Types.ObjectId();
      const mockTop50 = [
        {
          _id: new mongoose.Types.ObjectId(),
          username: 'alice',
          totalPoints: 1000,
        },
      ];

      jest.spyOn(User, 'find').mockReturnValue({
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockTop50),
      });

      // User has 50 points, and 95 people have more points
      jest.spyOn(User, 'countDocuments').mockResolvedValue(95);

      const req = {
        user: {
          _id: currentUserId,
          username: 'grinder',
          totalPoints: 50,
          createdAt: new Date('2026-01-01'),
        },
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await getOverallLeaderboard(req, res);

      const data = res.json.mock.calls[0][0];
      expect(data.currentUserRank).toBeDefined();
      expect(data.currentUserRank.rank).toBe(96);
      expect(data.currentUserRank.username).toBe('grinder');
    });
  });
});
