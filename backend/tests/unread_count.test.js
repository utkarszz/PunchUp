const { getUnreadCount } = require('../src/controllers/notificationController');
const Notification = require('../src/models/Notification');

describe('Notification Controller - getUnreadCount', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('Case A: should return count = 0 when user has no unread notifications', async () => {
    const mockUserId = 'user_abc_123';
    jest.spyOn(Notification, 'countDocuments').mockResolvedValue(0);

    const req = { user: { _id: mockUserId } };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    await getUnreadCount(req, res);

    expect(Notification.countDocuments).toHaveBeenCalledWith({
      recipient: mockUserId,
      isRead: false
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      count: 0,
      unreadCount: 0
    });
  });

  it('Case B: should return count = 1 when user has 1 unread notification', async () => {
    const mockUserId = 'user_abc_123';
    jest.spyOn(Notification, 'countDocuments').mockResolvedValue(1);

    const req = { user: { _id: mockUserId } };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    await getUnreadCount(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      count: 1,
      unreadCount: 1
    });
  });

  it('Case C: should return count = 7 when user has 7 unread notifications', async () => {
    const mockUserId = 'user_abc_123';
    jest.spyOn(Notification, 'countDocuments').mockResolvedValue(7);

    const req = { user: { _id: mockUserId } };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    await getUnreadCount(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      count: 7,
      unreadCount: 7
    });
  });

  it('Case D: should return count = 100 when user has 100 unread notifications', async () => {
    const mockUserId = 'user_abc_123';
    jest.spyOn(Notification, 'countDocuments').mockResolvedValue(100);

    const req = { user: { _id: mockUserId } };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    await getUnreadCount(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      count: 100,
      unreadCount: 100
    });
  });

  it('Case J: ensures User A cannot query User B notifications', async () => {
    const userA = 'user_A_111';
    const userB = 'user_B_222';

    jest.spyOn(Notification, 'countDocuments').mockImplementation(query => {
      if (query.recipient === userA) return Promise.resolve(3);
      if (query.recipient === userB) return Promise.resolve(99);
      return Promise.resolve(0);
    });

    const reqA = { user: { _id: userA } };
    const resA = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    await getUnreadCount(reqA, resA);

    expect(Notification.countDocuments).toHaveBeenCalledWith({
      recipient: userA,
      isRead: false
    });
    expect(resA.json).toHaveBeenCalledWith({
      success: true,
      count: 3,
      unreadCount: 3
    });
  });

  it('should return 500 when database query throws error', async () => {
    jest.spyOn(Notification, 'countDocuments').mockRejectedValue(new Error('DB Connection Timeout'));

    const req = { user: { _id: 'user_123' } };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    await getUnreadCount(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'DB Connection Timeout'
    });
  });
});
