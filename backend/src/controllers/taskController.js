const Task = require('../models/Task');
const streakService = require('../services/streakService');
const pointService = require('../services/pointService');

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

module.exports = {
  createTask,
  getTasks,
  updateTask,
  deleteTask,
  completeTask,
  getArchivedTasks,
};