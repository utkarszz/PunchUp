const mongoose = require('mongoose');
const Task = require('../src/models/Task');
const Notification = require('../src/models/Notification');
const PushSubscription = require('../src/models/PushSubscription');
const { createTask, updateTask, completeTask, deleteTask } = require('../src/controllers/taskController');
const { getVapidPublicKey, subscribePush, unsubscribePush } = require('../src/controllers/notificationController');
const { checkAndSendReminders } = require('../src/services/reminderScheduler');
const pushService = require('../src/services/pushService');
const streakService = require('../src/services/streakService');
const pointService = require('../src/services/pointService');

describe('Task Reminder & Notification System Backend Tests', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('1. Task Model Reminder Fields & Validation', () => {
    it('defaults reminderInterval to 0 and reminderEnabled to false', async () => {
      const task = new Task({
        title: 'No reminder task',
        user: new mongoose.Types.ObjectId(),
      });
      await task.validate();

      expect(task.reminderInterval).toBe(0);
      expect(task.reminderEnabled).toBe(false);
      expect(task.nextReminderAt).toBeNull();
    });

    it('accepts valid reminderInterval values: 0, 1, 2, 3, 4, 5', async () => {
      for (const interval of [0, 1, 2, 3, 4, 5]) {
        const task = new Task({
          title: `Task with interval ${interval}`,
          reminderInterval: interval,
          user: new mongoose.Types.ObjectId(),
        });
        await expect(task.validate()).resolves.toBeUndefined();
        expect(task.reminderInterval).toBe(interval);
      }
    });

    it('rejects invalid reminderInterval values outside 0-5', async () => {
      for (const invalid of [-1, 6, 10, 99]) {
        const task = new Task({
          title: `Task with invalid interval ${invalid}`,
          reminderInterval: invalid,
          user: new mongoose.Types.ObjectId(),
        });
        await expect(task.validate()).rejects.toThrow();
      }
    });
  });

  describe('2. Task Controller createTask Reminder Handling & Validation', () => {
    it('creates task with reminderInterval 2: enables reminder and sets nextReminderAt', async () => {
      const fixedNow = new Date('2026-10-03T10:00:00.000Z');
      jest.spyOn(Date, 'now').mockReturnValue(fixedNow.getTime());

      let createdDoc = null;
      jest.spyOn(Task, 'create').mockImplementation(async (data) => {
        createdDoc = { _id: new mongoose.Types.ObjectId(), ...data };
        return createdDoc;
      });

      const req = {
        user: { _id: new mongoose.Types.ObjectId() },
        body: {
          title: 'Complete DSA',
          reminderInterval: 2,
        },
      };

      let statusCalled = null;
      let jsonResult = null;
      const res = {
        status: (code) => {
          statusCalled = code;
          return {
            json: (data) => {
              jsonResult = data;
            },
          };
        },
      };

      await createTask(req, res);

      expect(statusCalled).toBe(201);
      expect(jsonResult.success).toBe(true);
      expect(createdDoc.reminderInterval).toBe(2);
      expect(createdDoc.reminderEnabled).toBe(true);
      const expectedNext = new Date(fixedNow.getTime() + 2 * 60 * 60 * 1000);
      expect(new Date(createdDoc.nextReminderAt).toISOString()).toBe(expectedNext.toISOString());
    });

    it('creates task with no reminder: interval 0, disabled, nextReminderAt null', async () => {
      let createdDoc = null;
      jest.spyOn(Task, 'create').mockImplementation(async (data) => {
        createdDoc = { _id: new mongoose.Types.ObjectId(), ...data };
        return createdDoc;
      });

      const req = {
        user: { _id: new mongoose.Types.ObjectId() },
        body: {
          title: 'Unreminded task',
          reminderInterval: 0,
        },
      };

      let statusCalled = null;
      let jsonResult = null;
      const res = {
        status: (code) => {
          statusCalled = code;
          return {
            json: (data) => {
              jsonResult = data;
            },
          };
        },
      };

      await createTask(req, res);

      expect(statusCalled).toBe(201);
      expect(createdDoc.reminderInterval).toBe(0);
      expect(createdDoc.reminderEnabled).toBe(false);
      expect(createdDoc.nextReminderAt).toBeNull();
    });

    it('rejects invalid reminder intervals in createTask (negative, out of bounds, non-integer, strings)', async () => {
      const invalidIntervals = [-1, 6, 2.5, 'two_hours', 'invalid'];

      for (const invalid of invalidIntervals) {
        let statusCalled = null;
        let jsonResult = null;
        const res = {
          status: (code) => {
            statusCalled = code;
            return {
              json: (data) => {
                jsonResult = data;
              },
            };
          },
        };

        const req = {
          user: { _id: new mongoose.Types.ObjectId() },
          body: {
            title: 'Task test',
            reminderInterval: invalid,
          },
        };

        await createTask(req, res);

        expect(statusCalled).toBe(400);
        expect(jsonResult.success).toBe(false);
        expect(jsonResult.message).toMatch(/Invalid reminder interval/);
      }
    });
  });

  describe('3. Task Controller updateTask Reminder Handling', () => {
    it('updates interval from 2 to 5: replaces old schedule with new interval', async () => {
      const fixedNow = new Date('2026-10-03T12:00:00.000Z');
      jest.spyOn(Date, 'now').mockReturnValue(fixedNow.getTime());

      const taskId = new mongoose.Types.ObjectId();
      const userId = new mongoose.Types.ObjectId();

      const existingTask = {
        _id: taskId,
        user: userId,
        title: 'Task 1',
        reminderInterval: 2,
        reminderEnabled: true,
      };

      jest.spyOn(Task, 'findOne').mockResolvedValue(existingTask);
      let updateSet = null;
      jest.spyOn(Task, 'findByIdAndUpdate').mockImplementation(async (id, update) => {
        updateSet = update.$set;
        return { ...existingTask, ...updateSet };
      });

      const req = {
        params: { id: taskId.toString() },
        user: { _id: userId },
        body: { reminderInterval: 5 },
      };

      let statusCalled = null;
      let jsonResult = null;
      const res = {
        status: (code) => {
          statusCalled = code;
          return {
            json: (data) => {
              jsonResult = data;
            },
          };
        },
      };

      await updateTask(req, res);

      expect(statusCalled).toBe(200);
      expect(updateSet.reminderInterval).toBe(5);
      expect(updateSet.reminderEnabled).toBe(true);
      const expectedNext = new Date(fixedNow.getTime() + 5 * 60 * 60 * 1000);
      expect(new Date(updateSet.nextReminderAt).toISOString()).toBe(expectedNext.toISOString());
    });

    it('disables reminder (interval 0): cancels schedule and sets nextReminderAt null', async () => {
      const taskId = new mongoose.Types.ObjectId();
      const userId = new mongoose.Types.ObjectId();

      const existingTask = {
        _id: taskId,
        user: userId,
        reminderInterval: 3,
        reminderEnabled: true,
      };

      jest.spyOn(Task, 'findOne').mockResolvedValue(existingTask);
      let updateSet = null;
      jest.spyOn(Task, 'findByIdAndUpdate').mockImplementation(async (id, update) => {
        updateSet = update.$set;
        return { ...existingTask, ...updateSet };
      });

      const req = {
        params: { id: taskId.toString() },
        user: { _id: userId },
        body: { reminderInterval: 0 },
      };

      let statusCalled = null;
      let jsonResult = null;
      const res = {
        status: (code) => {
          statusCalled = code;
          return {
            json: (data) => {
              jsonResult = data;
            },
          };
        },
      };

      await updateTask(req, res);

      expect(statusCalled).toBe(200);
      expect(updateSet.reminderInterval).toBe(0);
      expect(updateSet.reminderEnabled).toBe(false);
      expect(updateSet.nextReminderAt).toBeNull();
    });
  });

  describe('4. Task Lifecycle: Stopping Reminders upon Completion & Deletion', () => {
    it('stops reminders immediately when task is completed', async () => {
      const taskId = new mongoose.Types.ObjectId();
      const userId = new mongoose.Types.ObjectId();

      const mockTask = {
        _id: taskId,
        user: userId,
        completed: false,
        reminderInterval: 2,
        reminderEnabled: true,
        nextReminderAt: new Date(Date.now() + 3600000),
        save: jest.fn().mockResolvedValue(true),
      };

      jest.spyOn(Task, 'findOne').mockResolvedValue(mockTask);
      jest.spyOn(Task, 'findById').mockResolvedValue(mockTask);
      jest.spyOn(streakService, 'updateStreak').mockResolvedValue({ currentStreak: 1 });
      jest.spyOn(pointService, 'awardTaskCompletionPoints').mockResolvedValue({ awarded: true, points: 10 });
      jest.spyOn(pointService, 'getLeague').mockReturnValue('Bronze');

      const mockUser = { totalPoints: 10 };
      jest.spyOn(require('../src/models/User'), 'findById').mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUser),
      });

      const req = {
        params: { id: taskId.toString() },
        user: { _id: userId },
      };

      let statusCalled = null;
      let jsonResult = null;
      const res = {
        status: (code) => {
          statusCalled = code;
          return {
            json: (data) => {
              jsonResult = data;
            },
          };
        },
      };

      await completeTask(req, res);

      expect(statusCalled).toBe(200);
      expect(mockTask.completed).toBe(true);
      expect(mockTask.reminderEnabled).toBe(false);
      expect(mockTask.nextReminderAt).toBeNull();
      expect(mockTask.save).toHaveBeenCalled();
    });

    it('stops reminders immediately when task is soft-deleted', async () => {
      const taskId = new mongoose.Types.ObjectId();
      const userId = new mongoose.Types.ObjectId();

      const mockTask = {
        _id: taskId,
        user: userId,
        reminderInterval: 2,
        reminderEnabled: true,
        nextReminderAt: new Date(Date.now() + 3600000),
        isDeleted: false,
        save: jest.fn().mockResolvedValue(true),
      };

      jest.spyOn(Task, 'findOne').mockResolvedValue(mockTask);

      const req = {
        params: { id: taskId.toString() },
        user: { _id: userId },
        query: {},
      };

      let statusCalled = null;
      let jsonResult = null;
      const res = {
        status: (code) => {
          statusCalled = code;
          return {
            json: (data) => {
              jsonResult = data;
            },
          };
        },
      };

      await deleteTask(req, res);

      expect(statusCalled).toBe(200);
      expect(mockTask.isDeleted).toBe(true);
      expect(mockTask.reminderEnabled).toBe(false);
      expect(mockTask.nextReminderAt).toBeNull();
      expect(mockTask.save).toHaveBeenCalled();
    });
  });

  describe('5. Reminder Scheduler Processing', () => {
    it('processes due reminder, creates in-app notification, sends push, and advances schedule', async () => {
      const fixedNow = new Date('2026-10-03T14:00:00.000Z');
      jest.spyOn(Date, 'now').mockReturnValue(fixedNow.getTime());

      const taskId = new mongoose.Types.ObjectId();
      const userId = new mongoose.Types.ObjectId();

      const dueTask = {
        _id: taskId,
        user: userId,
        title: 'Review System Design',
        reminderInterval: 1,
        reminderEnabled: true,
        completed: false,
        isDeleted: false,
        nextReminderAt: new Date(fixedNow.getTime() - 60000),
        dueDate: new Date(fixedNow.getTime() + 10 * 3600000),
        save: jest.fn().mockResolvedValue(true),
      };

      jest.spyOn(Task, 'find').mockResolvedValue([dueTask]);
      jest.spyOn(Task, 'findOneAndUpdate').mockResolvedValue(dueTask);

      const notifCreateSpy = jest.spyOn(Notification, 'create').mockResolvedValue({ _id: new mongoose.Types.ObjectId() });
      const pushSpy = jest.spyOn(pushService, 'sendPushToUser').mockResolvedValue({ sent: 1, failed: 0 });

      const count = await checkAndSendReminders();

      expect(count).toBe(1);
      expect(notifCreateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          recipient: userId,
          type: 'task_reminder',
          task: taskId,
          message: 'Reminder: Review System Design',
        })
      );
      expect(pushSpy).toHaveBeenCalledWith(
        userId,
        expect.objectContaining({
          title: 'PunchUp',
          body: 'Reminder: Review System Design',
        })
      );

      // Verify schedule advanced by 1 hour (14:00 + 1 hour = 15:00)
      const expectedNext = new Date(fixedNow.getTime() + 1 * 3600000);
      expect(new Date(dueTask.nextReminderAt).toISOString()).toBe(expectedNext.toISOString());
    });

    it('stops reminder schedule if next reminder would fall past task dueDate', async () => {
      const fixedNow = new Date('2026-10-03T14:00:00.000Z');
      jest.spyOn(Date, 'now').mockReturnValue(fixedNow.getTime());

      const taskId = new mongoose.Types.ObjectId();
      const userId = new mongoose.Types.ObjectId();

      // Due date is in 30 minutes, but interval is 2 hours
      const dueTask = {
        _id: taskId,
        user: userId,
        title: 'Final task before deadline',
        reminderInterval: 2,
        reminderEnabled: true,
        completed: false,
        isDeleted: false,
        nextReminderAt: fixedNow,
        dueDate: new Date(fixedNow.getTime() + 30 * 60 * 1000),
        save: jest.fn().mockResolvedValue(true),
      };

      jest.spyOn(Task, 'find').mockResolvedValue([dueTask]);
      jest.spyOn(Task, 'findOneAndUpdate').mockResolvedValue(dueTask);
      jest.spyOn(Notification, 'create').mockResolvedValue({});
      jest.spyOn(pushService, 'sendPushToUser').mockResolvedValue({ sent: 1, failed: 0 });

      const count = await checkAndSendReminders();

      expect(count).toBe(1);
      // Because next interval (16:00) > dueDate (14:30), reminder schedule is exhausted
      expect(dueTask.reminderEnabled).toBe(false);
      expect(dueTask.nextReminderAt).toBeNull();
      expect(dueTask.save).toHaveBeenCalled();
    });
  });

  describe('6. Push Subscription & VAPID Endpoints', () => {
    it('getVapidPublicKey returns the public VAPID key', async () => {
      let statusCalled = null;
      let jsonResult = null;
      const res = {
        status: (code) => {
          statusCalled = code;
          return {
            json: (data) => {
              jsonResult = data;
            },
          };
        },
      };

      await getVapidPublicKey({}, res);

      expect(statusCalled).toBe(200);
      expect(jsonResult.success).toBe(true);
      expect(typeof jsonResult.publicKey).toBe('string');
      expect(jsonResult.publicKey.length).toBeGreaterThan(20);
    });

    it('subscribePush saves user subscription to database', async () => {
      const userId = new mongoose.Types.ObjectId();
      const mockSub = {
        _id: new mongoose.Types.ObjectId(),
        endpoint: 'https://fcm.googleapis.com/fcm/send/fake-sub-token',
        user: userId,
      };

      jest.spyOn(PushSubscription, 'findOneAndUpdate').mockResolvedValue(mockSub);

      const req = {
        user: { _id: userId },
        headers: { 'user-agent': 'Chrome/Test' },
        body: {
          endpoint: 'https://fcm.googleapis.com/fcm/send/fake-sub-token',
          keys: {
            p256dh: 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QT9t0A3qc...',
            auth: 'tBHItJI5svbpez7KI4CCXg==',
          },
        },
      };

      let statusCalled = null;
      let jsonResult = null;
      const res = {
        status: (code) => {
          statusCalled = code;
          return {
            json: (data) => {
              jsonResult = data;
            },
          };
        },
      };

      await subscribePush(req, res);

      expect(statusCalled).toBe(200);
      expect(jsonResult.success).toBe(true);
      expect(jsonResult.subscriptionId).toEqual(mockSub._id);
    });

    it('subscribePush rejects invalid/missing subscription payload', async () => {
      const req = {
        user: { _id: new mongoose.Types.ObjectId() },
        body: { endpoint: '' }, // missing keys
      };

      let statusCalled = null;
      let jsonResult = null;
      const res = {
        status: (code) => {
          statusCalled = code;
          return {
            json: (data) => {
              jsonResult = data;
            },
          };
        },
      };

      await subscribePush(req, res);

      expect(statusCalled).toBe(400);
      expect(jsonResult.success).toBe(false);
      expect(jsonResult.message).toMatch(/Invalid subscription payload/);
    });
  });
});
