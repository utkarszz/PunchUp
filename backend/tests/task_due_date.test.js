const mongoose = require('mongoose');
const Task = require('../src/models/Task');
const { createTask, getTasks, updateTask, completeTask } = require('../src/controllers/taskController');
const migrateTaskDueDates = require('../src/utils/migrateTaskDueDates');
const streakService = require('../src/services/streakService');
const pointService = require('../src/services/pointService');

describe('Task Due-Date System Backend Tests', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Task Mongoose Model Schema & Hooks', () => {
    it('1. Task without due date automatically gets 24-hour due date based on creation time', async () => {
      const now = new Date('2026-10-02T22:00:00.000Z');
      jest.spyOn(Date, 'now').mockReturnValue(now.getTime());

      const task = new Task({
        title: 'Auto 24h Task',
        user: new mongoose.Types.ObjectId(),
      });

      await task.validate();

      expect(task.dueDate).toBeDefined();
      const expectedDue = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      expect(task.dueDate.toISOString()).toBe(expectedDue.toISOString());
    });

    it('2. Task with explicit due date preserves user date and does not override it', async () => {
      const explicitDue = new Date('2026-10-15T15:30:00.000Z');
      const task = new Task({
        title: 'Explicit Date Task',
        dueDate: explicitDue,
        user: new mongoose.Types.ObjectId(),
      });

      await task.validate();

      expect(task.dueDate.toISOString()).toBe(explicitDue.toISOString());
    });

    it('3. Task with null/missing due date is auto-populated via pre-validate hook and cannot remain null', async () => {
      const now = new Date('2026-10-02T10:00:00.000Z');
      jest.spyOn(Date, 'now').mockReturnValue(now.getTime());

      const task = new Task({
        title: 'Null DueDate Task',
        dueDate: null,
        user: new mongoose.Types.ObjectId(),
      });

      await task.validate();

      expect(task.dueDate).not.toBeNull();
      const expectedDue = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      expect(task.dueDate.toISOString()).toBe(expectedDue.toISOString());
    });

    it('4. Uses createdAt timestamp when available for 24-hour calculation', async () => {
      const createdAt = new Date('2026-09-01T08:00:00.000Z');
      const task = new Task({
        title: 'CreatedAt Relative Task',
        user: new mongoose.Types.ObjectId(),
        createdAt: createdAt,
      });

      await task.validate();

      const expectedDue = new Date(createdAt.getTime() + 24 * 60 * 60 * 1000);
      expect(task.dueDate.toISOString()).toBe(expectedDue.toISOString());
    });
  });

  describe('Task Controller - createTask', () => {
    it('sets 24-hour due date when client provides no due date', async () => {
      const mockUserId = new mongoose.Types.ObjectId().toString();
      const now = new Date('2026-10-02T12:00:00.000Z');
      jest.spyOn(Date, 'now').mockReturnValue(now.getTime());

      let createdDoc;
      jest.spyOn(Task, 'create').mockImplementation(async (data) => {
        createdDoc = { ...data, _id: 'task_123' };
        return createdDoc;
      });

      const req = {
        user: { _id: mockUserId },
        body: {
          title: 'New Auto Task',
          description: 'Testing automatic 24h due date',
        },
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await createTask(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(Task.create).toHaveBeenCalled();
      const passedData = Task.create.mock.calls[0][0];
      const expectedDue = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      expect(new Date(passedData.dueDate).toISOString()).toBe(expectedDue.toISOString());
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('preserves user explicit due date and does NOT override with 24 hours', async () => {
      const mockUserId = new mongoose.Types.ObjectId().toString();
      const explicitDateStr = '2026-11-20T18:00:00.000Z';

      jest.spyOn(Task, 'create').mockImplementation(async (data) => data);

      const req = {
        user: { _id: mockUserId },
        body: {
          title: 'Future Task',
          dueDate: explicitDateStr,
        },
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await createTask(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      const passedData = Task.create.mock.calls[0][0];
      expect(new Date(passedData.dueDate).toISOString()).toBe(explicitDateStr);
    });

    it('rejects invalid due date format with 400 Bad Request', async () => {
      const req = {
        user: { _id: 'user_123' },
        body: {
          title: 'Invalid Date Task',
          dueDate: 'not-a-valid-date',
        },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await createTask(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid due date format',
      });
    });
  });

  describe('Task Controller - updateTask', () => {
    it('updates due date when explicit date is passed', async () => {
      const mockUserId = 'user_123';
      const taskId = 'task_abc';
      const existingTask = {
        _id: taskId,
        user: mockUserId,
        createdAt: new Date('2026-10-01T10:00:00.000Z'),
        dueDate: new Date('2026-10-02T10:00:00.000Z'),
      };

      jest.spyOn(Task, 'findOne').mockResolvedValue(existingTask);
      jest.spyOn(Task, 'findByIdAndUpdate').mockImplementation(async (id, update) => ({
        ...existingTask,
        ...update.$set,
      }));

      const newDateStr = '2026-10-10T20:00:00.000Z';
      const req = {
        params: { id: taskId },
        user: { _id: mockUserId },
        body: { dueDate: newDateStr },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await updateTask(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const updateArg = Task.findByIdAndUpdate.mock.calls[0][1].$set;
      expect(new Date(updateArg.dueDate).toISOString()).toBe(newDateStr);
    });

    it('resets due date to createdAt + 24h when client clears due date (never null)', async () => {
      const mockUserId = 'user_123';
      const taskId = 'task_abc';
      const createdAt = new Date('2026-10-01T10:00:00.000Z');
      const existingTask = {
        _id: taskId,
        user: mockUserId,
        createdAt: createdAt,
        dueDate: new Date('2026-10-10T10:00:00.000Z'),
      };

      jest.spyOn(Task, 'findOne').mockResolvedValue(existingTask);
      jest.spyOn(Task, 'findByIdAndUpdate').mockImplementation(async (id, update) => ({
        ...existingTask,
        ...update.$set,
      }));

      const req = {
        params: { id: taskId },
        user: { _id: mockUserId },
        body: { dueDate: '' }, // User cleared due date
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await updateTask(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const updateArg = Task.findByIdAndUpdate.mock.calls[0][1].$set;
      const expectedDue = new Date(createdAt.getTime() + 24 * 60 * 60 * 1000);
      expect(new Date(updateArg.dueDate).toISOString()).toBe(expectedDue.toISOString());
    });
  });

  describe('Task Controller - getTasks query', () => {
    it('queries for both incomplete tasks and recent/future completed tasks', async () => {
      const mockUserId = 'user_123';
      const mockFind = {
        sort: jest.fn().mockResolvedValue([
          { _id: '1', title: 'Overdue task', completed: false, dueDate: new Date('2026-09-01') },
          { _id: '2', title: 'Active task', completed: false, dueDate: new Date('2026-10-05') },
        ]),
      };
      jest.spyOn(Task, 'find').mockReturnValue(mockFind);

      const req = { user: { _id: mockUserId } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      await getTasks(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(Task.find).toHaveBeenCalledWith(
        expect.objectContaining({
          user: mockUserId,
          isDeleted: { $ne: true },
          $or: expect.arrayContaining([
            { completed: false },
          ]),
        })
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          count: 2,
        })
      );
    });
  });

  describe('Task Controller - completeTask (Overdue completion)', () => {
    it('completing an overdue task updates completed, triggers streak and points', async () => {
      const mockUserId = 'user_123';
      const taskId = 'task_overdue_1';
      const overdueTask = {
        _id: taskId,
        user: mockUserId,
        completed: false,
        dueDate: new Date('2026-09-01T10:00:00.000Z'), // Far in past (overdue)
        save: jest.fn().mockResolvedValue(true),
      };

      jest.spyOn(Task, 'findOne').mockResolvedValue(overdueTask);
      jest.spyOn(streakService, 'updateStreak').mockResolvedValue({ currentStreak: 5 });
      jest.spyOn(pointService, 'awardTaskCompletionPoints').mockResolvedValue({ awarded: true, points: 10 });
      jest.spyOn(Task, 'findById').mockResolvedValue({ ...overdueTask, completed: true, completedAt: new Date() });
      jest.spyOn(require('../src/models/User'), 'findById').mockReturnValue({
        select: jest.fn().mockResolvedValue({ totalPoints: 150 }),
      });

      const req = { params: { id: taskId }, user: { _id: mockUserId } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      await completeTask(req, res);

      expect(overdueTask.completed).toBe(true);
      expect(overdueTask.completedAt).toBeInstanceOf(Date);
      expect(streakService.updateStreak).toHaveBeenCalledWith(mockUserId);
      expect(pointService.awardTaskCompletionPoints).toHaveBeenCalledWith(mockUserId, taskId);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          pointsAwarded: 10,
        })
      );
    });
  });

  describe('Migration - migrateTaskDueDates', () => {
    it('safely backfills missing/null due dates without marking completed tasks overdue', async () => {
      const createdAt1 = new Date('2026-09-10T12:00:00.000Z');
      const mockLegacyTasks = [
        { _id: 'legacy_1', createdAt: createdAt1, completed: false }, // missing dueDate
        { _id: 'legacy_2', createdAt: null, completed: true },        // null dueDate, completed
      ];

      jest.spyOn(Task, 'find').mockResolvedValue(mockLegacyTasks);
      jest.spyOn(Task, 'findByIdAndUpdate').mockResolvedValue({});

      const result = await migrateTaskDueDates();

      expect(result.success).toBe(true);
      expect(result.count).toBe(2);
      expect(Task.findByIdAndUpdate).toHaveBeenCalledTimes(2);

      // Check task 1 used createdAt + 24 hours
      const firstCallArgs = Task.findByIdAndUpdate.mock.calls[0];
      expect(firstCallArgs[0]).toBe('legacy_1');
      const expectedDue1 = new Date(createdAt1.getTime() + 24 * 60 * 60 * 1000);
      expect(firstCallArgs[1].$set.dueDate.toISOString()).toBe(expectedDue1.toISOString());

      // Task 2 kept completed: true (not modified by update)
      expect(mockLegacyTasks[1].completed).toBe(true);
    });

    it('returns count = 0 if no legacy tasks without dueDate exist', async () => {
      jest.spyOn(Task, 'find').mockResolvedValue([]);
      const result = await migrateTaskDueDates();
      expect(result.success).toBe(true);
      expect(result.count).toBe(0);
    });
  });
});
