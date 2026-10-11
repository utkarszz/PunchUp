const mongoose = require('mongoose');
const Task = require('../src/models/Task');
const RecurringTask = require('../src/models/RecurringTask');
const Notification = require('../src/models/Notification');
const pushService = require('../src/services/pushService');
const {
  getLocalDateString,
  parseTime,
  getUtcInstantForLocalDateTime,
  computeNextRunAt,
} = require('../src/utils/recurrenceHelpers');
const {
  generateTaskForSchedule,
} = require('../src/services/recurringTaskScheduler');
const {
  createTask,
  deleteTask,
} = require('../src/controllers/taskController');

describe('Recurring Tasks & Scheduler Test Suite', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('1. Timezone and Recurrence Utility Helpers', () => {
    it('accurately derives local date string in different timezones', () => {
      // 2026-10-15 22:30:00 UTC is 2026-10-16 in Asia/Kolkata (+5:30) and 2026-10-15 in America/New_York (-4:00 EDT)
      const instant = new Date('2026-10-15T22:30:00.000Z');

      const istDate = getLocalDateString(instant, 'Asia/Kolkata');
      const nyDate = getLocalDateString(instant, 'America/New_York');
      const utcDate = getLocalDateString(instant, 'UTC');

      expect(istDate).toBe('2026-10-16');
      expect(nyDate).toBe('2026-10-15');
      expect(utcDate).toBe('2026-10-15');
    });

    it('correctly parses 24-hour time string with validation and clamping', () => {
      expect(parseTime('07:00')).toEqual({ hours: 7, minutes: 0 });
      expect(parseTime('18:45')).toEqual({ hours: 18, minutes: 45 });
      expect(parseTime('invalid')).toEqual({ hours: 7, minutes: 0 });
      expect(parseTime('25:99')).toEqual({ hours: 23, minutes: 59 });
    });

    it('calculates exact UTC instant for local date and time without host skew', () => {
      const utcInstant = getUtcInstantForLocalDateTime('2026-10-15', '07:00', 'UTC');
      expect(utcInstant.toISOString()).toBe('2026-10-15T07:00:00.000Z');

      const istInstant = getUtcInstantForLocalDateTime('2026-10-15', '07:00', 'Asia/Kolkata');
      // 07:00 IST is 01:30 UTC
      expect(istInstant.toISOString()).toBe('2026-10-15T01:30:00.000Z');
    });

    it('computes nextRunAt into tomorrow if target creationTime has passed today', () => {
      // Current instant is 10:00 AM UTC on 2026-10-15
      const now = new Date('2026-10-15T10:00:00.000Z');
      const nextRun = computeNextRunAt('07:00', 'UTC', now, '2026-10-15');

      // Next run should be 07:00 UTC on 2026-10-16
      expect(nextRun.toISOString()).toBe('2026-10-16T07:00:00.000Z');
    });

    it('computes nextRunAt for today if target creationTime is in the future today', () => {
      // Current instant is 05:00 AM UTC on 2026-10-15
      const now = new Date('2026-10-15T05:00:00.000Z');
      const nextRun = computeNextRunAt('07:00', 'UTC', now, null);

      // Next run should be 07:00 UTC on 2026-10-15
      expect(nextRun.toISOString()).toBe('2026-10-15T07:00:00.000Z');
    });
  });

  describe('2. RecurringTask & Task Models Validation & Idempotency', () => {
    it('RecurringTask schema sets defaults correctly', async () => {
      const schedule = new RecurringTask({
        title: 'Daily CP Routine',
        user: new mongoose.Types.ObjectId(),
      });
      await schedule.validate();

      expect(schedule.creationTime).toBe('07:00');
      expect(schedule.frequency).toBe('daily');
      expect(schedule.isActive).toBe(true);
      expect(schedule.timeZone).toBe('UTC');
      expect(schedule.reminderInterval).toBe(0);
    });

    it('Task model accepts recurringTaskId and recurrenceDate', async () => {
      const scheduleId = new mongoose.Types.ObjectId();
      const task = new Task({
        title: 'Daily CP Instance',
        user: new mongoose.Types.ObjectId(),
        recurringTaskId: scheduleId,
        recurrenceDate: '2026-10-15',
      });
      await task.validate();

      expect(task.recurringTaskId.toString()).toBe(scheduleId.toString());
      expect(task.recurrenceDate).toBe('2026-10-15');
    });
  });

  describe('3. Scheduler Execution & Idempotent Generation', () => {
    it('generates task and sends creation notification with tag deduplication', async () => {
      const userId = new mongoose.Types.ObjectId();
      const schedule = {
        _id: new mongoose.Types.ObjectId(),
        user: userId,
        title: 'Daily CP',
        description: 'Solve 2 Codeforces problems',
        priority: 'high',
        category: 'work',
        creationTime: '07:00',
        timeZone: 'UTC',
        reminderInterval: 2,
        isActive: true,
        save: jest.fn().mockResolvedValue(true),
      };

      // Mock Task.findOne returning null (not yet created for today)
      jest.spyOn(Task, 'findOne').mockResolvedValue(null);

      let createdTask = null;
      jest.spyOn(Task, 'create').mockImplementation(async (data) => {
        createdTask = { _id: new mongoose.Types.ObjectId(), ...data };
        return createdTask;
      });

      let createdNotif = null;
      jest.spyOn(Notification, 'create').mockImplementation(async (data) => {
        createdNotif = data;
        return data;
      });

      const pushSpy = jest.spyOn(pushService, 'sendPushToUser').mockResolvedValue({ sent: 1, failed: 0 });

      const now = new Date('2026-10-15T07:05:00.000Z');
      const task = await generateTaskForSchedule(schedule, now);

      expect(task).toBeDefined();
      expect(task.title).toBe('Daily CP');
      expect(task.recurrenceDate).toBe('2026-10-15');
      expect(task.reminderInterval).toBe(2);
      expect(task.reminderEnabled).toBe(true);

      // Verify in-app notification created
      expect(createdNotif).toBeDefined();
      expect(createdNotif.type).toBe('task_created');
      expect(createdNotif.recipient.toString()).toBe(userId.toString());

      // Verify push notification sent with tag deduplication
      expect(pushSpy).toHaveBeenCalledWith(
        userId,
        expect.objectContaining({
          title: 'Daily Task Created 🎯',
          tag: expect.stringContaining('recurring-created-'),
        })
      );
    });

    it('prevents duplicate task generation if task for schedule and local date already exists', async () => {
      const schedule = {
        _id: new mongoose.Types.ObjectId(),
        user: new mongoose.Types.ObjectId(),
        title: 'Daily CP',
        creationTime: '07:00',
        timeZone: 'UTC',
        save: jest.fn().mockResolvedValue(true),
      };

      // Mock Task.findOne returning an existing instance
      jest.spyOn(Task, 'findOne').mockResolvedValue({
        _id: new mongoose.Types.ObjectId(),
        title: 'Daily CP',
        recurrenceDate: '2026-10-15',
      });

      const createSpy = jest.spyOn(Task, 'create');
      const notifSpy = jest.spyOn(Notification, 'create');

      const now = new Date('2026-10-15T07:05:00.000Z');
      const result = await generateTaskForSchedule(schedule, now);

      expect(result).toBeNull();
      expect(createSpy).not.toHaveBeenCalled();
      expect(notifSpy).not.toHaveBeenCalled();
      expect(schedule.save).toHaveBeenCalled(); // schedule advances to next day
    });
  });

  describe('4. Task Controller Recurrence Integration', () => {
    it('createTask with isRecurring=true creates Persistent Schedule and initial Task', async () => {
      const req = {
        user: { _id: new mongoose.Types.ObjectId() },
        body: {
          title: 'Morning Yoga',
          description: '15 min stretch',
          priority: 'low',
          category: 'health',
          isRecurring: true,
          creationTime: '06:30',
          timeZone: 'UTC',
        },
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      const schedId = new mongoose.Types.ObjectId();
      jest.spyOn(RecurringTask, 'create').mockResolvedValue({
        _id: schedId,
        title: req.body.title,
        save: jest.fn().mockResolvedValue(true),
      });

      jest.spyOn(Task, 'create').mockImplementation(async (data) => ({
        _id: new mongoose.Types.ObjectId(),
        ...data,
      }));

      await createTask(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      const responseData = res.json.mock.calls[0][0];
      expect(responseData.success).toBe(true);
      expect(responseData.task.recurringTaskId.toString()).toBe(schedId.toString());
      expect(responseData.recurringSchedule).toBeDefined();
    });

    it('deleteTask deletes today instance but preserves recurrence when stopRecurrence is false', async () => {
      const taskId = new mongoose.Types.ObjectId();
      const scheduleId = new mongoose.Types.ObjectId();
      const mockTask = {
        _id: taskId,
        user: new mongoose.Types.ObjectId(),
        recurringTaskId: scheduleId,
        isDeleted: false,
        save: jest.fn().mockResolvedValue(true),
      };

      const req = {
        user: { _id: mockTask.user },
        params: { id: taskId.toString() },
        query: { stopRecurrence: 'false' },
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      jest.spyOn(Task, 'findOne').mockResolvedValue(mockTask);
      const scheduleUpdateSpy = jest.spyOn(RecurringTask, 'findOneAndUpdate');

      await deleteTask(req, res);

      expect(mockTask.isDeleted).toBe(true);
      expect(scheduleUpdateSpy).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json.mock.calls[0][0].success).toBe(true);
    });

    it('deleteTask deletes instance and stops future recurrence when stopRecurrence is true', async () => {
      const taskId = new mongoose.Types.ObjectId();
      const scheduleId = new mongoose.Types.ObjectId();
      const mockTask = {
        _id: taskId,
        user: new mongoose.Types.ObjectId(),
        recurringTaskId: scheduleId,
        isDeleted: false,
        save: jest.fn().mockResolvedValue(true),
      };

      const req = {
        user: { _id: mockTask.user },
        params: { id: taskId.toString() },
        query: { stopRecurrence: 'true' },
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      jest.spyOn(Task, 'findOne').mockResolvedValue(mockTask);
      const scheduleUpdateSpy = jest.spyOn(RecurringTask, 'findOneAndUpdate').mockResolvedValue(true);

      await deleteTask(req, res);

      expect(mockTask.isDeleted).toBe(true);
      expect(scheduleUpdateSpy).toHaveBeenCalledWith(
        { _id: scheduleId, user: mockTask.user },
        { $set: { isActive: false, nextRunAt: null } }
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });
});
