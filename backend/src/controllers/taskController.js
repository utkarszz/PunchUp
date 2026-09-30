const Task = require('../models/Task');
const { updateStreak } = require('../services/streakService');
const { awardTaskCompletionPoints, getLeague } = require('../services/pointService');

const createTask = async (req, res) => {
  try {
    const { title, description, priority, category, dueDate } = req.body;

    if (dueDate) {
      const parsedDate = new Date(dueDate);
      if (isNaN(parsedDate.getTime())) {
        return res.status(400).json({ success: false, message: 'Invalid due date format' });
      }
    }

    const task = await Task.create({
      title,
      description,
      priority,
      category,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      user: req.user._id,
    });

    res.status(201).json({ success: true, task });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Active task query ────────────────────────────────────────────────────────
// Show an active task when ANY of these is true:
//   1. Task is not completed (always visible until completed or deleted)
//   2. Task IS completed + has a future dueDate (visible until due date passes)
//   3. Task IS completed + has NO dueDate + was completed within the last 24h
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
        // 2. Completed with a due date that hasn't passed yet
        {
          completed: true,
          dueDate: { $exists: true, $ne: null, $gt: now },
        },
        // 3. Completed with no due date, within 24h window
        {
          completed: true,
          $or: [{ dueDate: { $exists: false } }, { dueDate: null }],
          completedAt: { $gte: twentyFourHoursAgo },
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

    const { dueDate } = req.body;
    if (dueDate !== undefined) {
      if (dueDate) {
        const parsedDate = new Date(dueDate);
        if (isNaN(parsedDate.getTime())) {
          return res.status(400).json({ success: false, message: 'Invalid due date format' });
        }
        req.body.dueDate = parsedDate;
      } else {
        req.body.dueDate = null;
      }
    }

    // Whitelist only allowed fields — never pass raw req.body to prevent mass assignment
    const allowedFields = {};
    if (req.body.title !== undefined) allowedFields.title = req.body.title;
    if (req.body.description !== undefined) allowedFields.description = req.body.description;
    if (req.body.priority !== undefined) allowedFields.priority = req.body.priority;
    if (req.body.category !== undefined) allowedFields.category = req.body.category;
    if (req.body.dueDate !== undefined) allowedFields.dueDate = req.body.dueDate;

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
        league: getLeague(user?.totalPoints || 0),
        alreadyCompleted: true,
      });
    }

    // First-time completion
    task.completed = true;
    task.completedAt = new Date();
    await task.save();

    // Update streak (existing, idempotent per-day logic)
    await updateStreak(req.user._id);

    // Award points (idempotent — duplicate-safe)
    const pointResult = await awardTaskCompletionPoints(req.user._id, task._id);

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
      league: getLeague(newTotalPoints),
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