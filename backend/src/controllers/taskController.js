const Task = require('../models/Task');
const RecurringTask = require('../models/RecurringTask');
const streakService = require('../services/streakService');
const pointService = require('../services/pointService');
const { getLocalDateString, computeNextRunAt } = require('../utils/recurrenceHelpers');
const { checkAndGenerateRecurringTasks } = require('../services/recurringTaskScheduler');

const createTask = async (req, res) => {
  try {
    const { title, description, priority, category, dueDate } = req.body;

    let parsedDueDate;
    if (dueDate !== undefined && dueDate !== null && dueDate !== "") {
      parsedDueDate = new Date(dueDate);
      if (isNaN(parsedDueDate.getTime())) {
        return res.status(400).json({ success: false, message: 'Invalid due date format' });
      }
    }

    let reminderInterval = 0;
    if (req.body.reminderInterval !== undefined && req.body.reminderInterval !== null && req.body.reminderInterval !== "") {
      const parsedInterval = Number(req.body.reminderInterval);
      if (!Number.isInteger(parsedInterval) || parsedInterval < 0 || parsedInterval > 5) {
        return res.status(400).json({
          success: false,
          message: 'Invalid reminder interval. Must be an integer between 0 and 5.',
        });
      }
      reminderInterval = parsedInterval;
    }

    // Check if recurring task creation is requested
    const isRecurring = req.body.isRecurring === true || req.body.frequency === 'daily';

    if (isRecurring) {
      const creationTime = req.body.creationTime || '07:00';
      const timeZone = (req.body.timeZone && typeof req.body.timeZone === 'string') ? req.body.timeZone.trim() : 'UTC';
      const startDate = req.body.startDate ? new Date(req.body.startDate) : new Date();
      const endDate = req.body.endDate ? new Date(req.body.endDate) : null;

      const scheduleData = {
        title,
        description: description || '',
        priority: priority || 'medium',
        category: category || 'general',
        user: req.user._id,
        creationTime,
        timeZone,
        startDate,
        endDate,
        reminderInterval,
        isActive: true,
      };

      const now = new Date();
      const localDateStr = getLocalDateString(now, timeZone);

      // Create persistent recurrence definition
      const recurringSchedule = await RecurringTask.create(scheduleData);

      // Generate today's initial instance linked to this schedule
      const taskDue = parsedDueDate || new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const taskData = {
        title,
        description: description || '',
        priority: priority || 'medium',
        category: category || 'general',
        user: req.user._id,
        dueDate: taskDue,
        reminderInterval,
        reminderEnabled: reminderInterval > 0,
        nextReminderAt: reminderInterval > 0 ? new Date(Date.now() + reminderInterval * 60 * 60 * 1000) : null,
        recurringTaskId: recurringSchedule._id,
        recurrenceDate: localDateStr,
      };

      const task = await Task.create(taskData);

      // Advance schedule to next day at creationTime
      const nextRun = computeNextRunAt(creationTime, timeZone, new Date(now.getTime() + 60 * 1000), localDateStr);
      recurringSchedule.lastGeneratedDate = localDateStr;
      recurringSchedule.lastGeneratedAt = now;
      recurringSchedule.nextRunAt = nextRun;
      await recurringSchedule.save();

      return res.status(201).json({
        success: true,
        task,
        recurringSchedule,
      });
    }

    const taskData = {
      title,
      description,
      priority,
      category,
      user: req.user._id,
      reminderInterval,
      reminderEnabled: reminderInterval > 0,
      nextReminderAt: reminderInterval > 0 ? new Date(Date.now() + reminderInterval * 60 * 60 * 1000) : null,
    };

    if (parsedDueDate) {
      taskData.dueDate = parsedDueDate;
    } else {
      taskData.dueDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
    }

    const task = await Task.create(taskData);

    res.status(201).json({ success: true, task });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Active task query ────────────────────────────────────────────────────────
// Show an active task when ANY of these is true:
//   1. Task is not completed (always visible until completed or deleted — overdue tasks remain until user completes them)
//   2. Task IS completed + (has a future dueDate OR was completed within the last 24h window)
const getTasks = async (req, res) => {
  try {
    const now = new Date();
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const tasks = await Task.find({
      user: req.user._id,
      isDeleted: { $ne: true },
      $or: [
        // 1. Incomplete — always show
        { completed: false },
        // 2. Completed with future due date OR completed within the last 24h window
        {
          completed: true,
          $or: [
            { dueDate: { $gt: now } },
            { completedAt: { $gte: twentyFourHoursAgo } },
          ],
        },
      ],
    }).sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: tasks.length, tasks });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateTask = async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, user: req.user._id });

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    // Whitelist only allowed fields — never pass raw req.body to prevent mass assignment
    const allowedFields = {};
    if (req.body.title !== undefined) allowedFields.title = req.body.title;
    if (req.body.description !== undefined) allowedFields.description = req.body.description;
    if (req.body.priority !== undefined) allowedFields.priority = req.body.priority;
    if (req.body.category !== undefined) allowedFields.category = req.body.category;

    if (req.body.dueDate !== undefined) {
      if (req.body.dueDate) {
        const parsedDate = new Date(req.body.dueDate);
        if (isNaN(parsedDate.getTime())) {
          return res.status(400).json({ success: false, message: 'Invalid due date format' });
        }
        allowedFields.dueDate = parsedDate;
      } else {
        // If explicitly set to empty or null, reset to 24h from task creation
        const base = task.createdAt ? new Date(task.createdAt).getTime() : Date.now();
        allowedFields.dueDate = new Date(base + 24 * 60 * 60 * 1000);
      }
    }

    if (req.body.reminderInterval !== undefined) {
      if (req.body.reminderInterval === null || req.body.reminderInterval === '') {
        allowedFields.reminderInterval = 0;
        allowedFields.reminderEnabled = false;
        allowedFields.nextReminderAt = null;
      } else {
        const parsedInterval = Number(req.body.reminderInterval);
        if (!Number.isInteger(parsedInterval) || parsedInterval < 0 || parsedInterval > 5) {
          return res.status(400).json({
            success: false,
            message: 'Invalid reminder interval. Must be an integer between 0 and 5.',
          });
        }
        allowedFields.reminderInterval = parsedInterval;
        if (parsedInterval > 0) {
          allowedFields.reminderEnabled = true;
          allowedFields.nextReminderAt = new Date(Date.now() + parsedInterval * 60 * 60 * 1000);
        } else {
          allowedFields.reminderEnabled = false;
          allowedFields.nextReminderAt = null;
        }
      }
    }

    const updatedTask = await Task.findByIdAndUpdate(req.params.id, { $set: allowedFields }, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({ success: true, task: updatedTask });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteTask = async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, user: req.user._id });

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    const permanent = req.query.permanent === 'true';
    const stopRecurrence = req.query.stopRecurrence === 'true';

    // If task was generated from a recurring schedule and user chose to stop recurrence
    if (task.recurringTaskId && stopRecurrence) {
      await RecurringTask.findOneAndUpdate(
        { _id: task.recurringTaskId, user: req.user._id },
        { $set: { isActive: false, nextRunAt: null } }
      );
    }

    if (permanent) {
      await task.deleteOne();
    } else {
      task.isDeleted = true;
      task.reminderEnabled = false;
      task.nextReminderAt = null;
      await task.save();
    }

    res.status(200).json({
      success: true,
      message: permanent ? 'Task permanently deleted' : 'Task deleted successfully',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Kept for internal/historical use — no frontend UI exposes this any more
const getArchivedTasks = async (req, res) => {
  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const tasks = await Task.find({
      user: req.user._id,
      completed: true,
      completedAt: { $lt: twentyFourHoursAgo },
      isDeleted: { $ne: true },
    }).sort({ completedAt: -1 });

    res.status(200).json({ success: true, count: tasks.length, tasks });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Complete a task (idempotent) ─────────────────────────────────────────────
// Points are only awarded on the first true→false→true transition.
// All subsequent calls to this endpoint return the task without re-awarding.
const completeTask = async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, user: req.user._id });

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    // Already completed — return current state, award nothing
    if (task.completed) {
      const user = await require('../models/User').findById(req.user._id).select('totalPoints');
      return res.status(200).json({
        success: true,
        message: 'Task was already completed',
        task,
        pointsAwarded: 0,
        newTotalPoints: user?.totalPoints || 0,
        league: pointService.getLeague(user?.totalPoints || 0),
        alreadyCompleted: true,
      });
    }

    // First-time completion
    task.completed = true;
    task.completedAt = new Date();
    task.reminderEnabled = false;
    task.nextReminderAt = null;
    await task.save();

    // Update streak (existing, idempotent per-day logic)
    await streakService.updateStreak(req.user._id);

    // Award points (idempotent — duplicate-safe)
    const pointResult = await pointService.awardTaskCompletionPoints(req.user._id, task._id);

    // Re-fetch updated task and user
    const [updatedTask, user] = await Promise.all([
      Task.findById(task._id),
      require('../models/User').findById(req.user._id).select('totalPoints'),
    ]);

    const newTotalPoints = user?.totalPoints || 0;

    res.status(200).json({
      success: true,
      message: 'Task completed successfully',
      task: updatedTask,
      pointsAwarded: pointResult.awarded ? pointResult.points : 0,
      newTotalPoints,
      league: pointService.getLeague(newTotalPoints),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Recurring Tasks Management ────────────────────────────────────────────────
const getRecurringTasks = async (req, res) => {
  try {
    const schedules = await RecurringTask.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: schedules.length, schedules });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createRecurringSchedule = async (req, res) => {
  try {
    const { title, description, priority, category, creationTime, timeZone, startDate, endDate, reminderInterval } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Title is required' });
    }

    const validInterval = Number(reminderInterval) || 0;
    const tz = (timeZone && typeof timeZone === 'string') ? timeZone.trim() : 'UTC';
    const cTime = creationTime || '07:00';
    const sDate = startDate ? new Date(startDate) : new Date();
    const eDate = endDate ? new Date(endDate) : null;

    const schedule = new RecurringTask({
      user: req.user._id,
      title: title.trim(),
      description: description || '',
      priority: priority || 'medium',
      category: category || 'general',
      creationTime: cTime,
      timeZone: tz,
      startDate: sDate,
      endDate: eDate,
      reminderInterval: validInterval,
      isActive: true,
    });

    schedule.nextRunAt = computeNextRunAt(cTime, tz, new Date(), null);
    await schedule.save();

    res.status(201).json({ success: true, schedule });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateRecurringSchedule = async (req, res) => {
  try {
    const schedule = await RecurringTask.findOne({ _id: req.params.id, user: req.user._id });
    if (!schedule) {
      return res.status(404).json({ success: false, message: 'Recurring schedule not found' });
    }

    const { title, description, priority, category, creationTime, timeZone, startDate, endDate, reminderInterval, isActive } = req.body;

    if (title !== undefined) schedule.title = title.trim();
    if (description !== undefined) schedule.description = description;
    if (priority !== undefined) schedule.priority = priority;
    if (category !== undefined) schedule.category = category;
    if (creationTime !== undefined) schedule.creationTime = creationTime;
    if (timeZone !== undefined) schedule.timeZone = timeZone.trim();
    if (startDate !== undefined) schedule.startDate = startDate ? new Date(startDate) : new Date();
    if (endDate !== undefined) schedule.endDate = endDate ? new Date(endDate) : null;
    if (reminderInterval !== undefined) schedule.reminderInterval = Number(reminderInterval) || 0;
    if (isActive !== undefined) schedule.isActive = Boolean(isActive);

    if (schedule.isActive) {
      schedule.nextRunAt = computeNextRunAt(schedule.creationTime, schedule.timeZone, new Date(), schedule.lastGeneratedDate);
    } else {
      schedule.nextRunAt = null;
    }

    await schedule.save();
    res.status(200).json({ success: true, schedule });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteRecurringSchedule = async (req, res) => {
  try {
    const schedule = await RecurringTask.findOne({ _id: req.params.id, user: req.user._id });
    if (!schedule) {
      return res.status(404).json({ success: false, message: 'Recurring schedule not found' });
    }

    await schedule.deleteOne();
    res.status(200).json({ success: true, message: 'Recurring schedule deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const triggerRecurringCheck = async (req, res) => {
  try {
    const count = await checkAndGenerateRecurringTasks();
    res.status(200).json({ success: true, message: `Processed recurring tasks. Generated: ${count}`, generatedCount: count });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createTask,
  getTasks,
  updateTask,
  deleteTask,
  completeTask,
  getArchivedTasks,
  getRecurringTasks,
  createRecurringSchedule,
  updateRecurringSchedule,
  deleteRecurringSchedule,
  triggerRecurringCheck,
};