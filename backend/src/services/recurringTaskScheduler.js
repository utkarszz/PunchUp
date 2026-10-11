const RecurringTask = require('../models/RecurringTask');
const Task = require('../models/Task');
const Notification = require('../models/Notification');
const pushService = require('./pushService');
const { getLocalDateString, computeNextRunAt } = require('../utils/recurrenceHelpers');

let recurringSchedulerInterval = null;
let isProcessing = false;

/**
 * Checks database for recurring task schedules that are due to generate today's task.
 * Creates task idempotently, triggers notification, and advances nextRunAt.
 *
 * @returns {Promise<number>} Number of daily tasks generated
 */
const checkAndGenerateRecurringTasks = async () => {
  if (isProcessing) return 0;
  isProcessing = true;

  try {
    const now = new Date();

    // Query active recurring schedules that are due
    const dueSchedules = await RecurringTask.find({
      isActive: true,
      nextRunAt: { $lte: now },
    });

    if (!dueSchedules || dueSchedules.length === 0) {
      isProcessing = false;
      return 0;
    }

    let generatedCount = 0;

    for (const schedule of dueSchedules) {
      try {
        // Atomic lease claim to prevent concurrent worker execution race conditions
        const claimed = await RecurringTask.findOneAndUpdate(
          {
            _id: schedule._id,
            isActive: true,
            nextRunAt: { $lte: now },
          },
          {
            $set: {
              // 5-minute processing lease
              nextRunAt: new Date(Date.now() + 5 * 60 * 1000),
            },
          },
          { new: true }
        );

        if (!claimed) continue;

        // Check if start date is in the future
        if (claimed.startDate && now.getTime() < new Date(claimed.startDate).getTime()) {
          claimed.nextRunAt = new Date(claimed.startDate);
          await claimed.save();
          continue;
        }

        // Check if end date has passed
        if (claimed.endDate && now.getTime() > new Date(claimed.endDate).getTime()) {
          claimed.isActive = false;
          claimed.nextRunAt = null;
          await claimed.save();
          continue;
        }

        const localDateStr = getLocalDateString(now, claimed.timeZone);

        // Idempotency: Check if task for this recurring schedule and local calendar date already exists
        let task = await Task.findOne({
          recurringTaskId: claimed._id,
          recurrenceDate: localDateStr,
        });

        let isNewlyCreated = false;

        if (!task) {
          const taskDue = new Date(now.getTime() + 24 * 60 * 60 * 1000);
          const reminderInterval = claimed.reminderInterval || 0;

          const taskData = {
            title: claimed.title,
            description: claimed.description || '',
            priority: claimed.priority || 'medium',
            category: claimed.category || 'general',
            user: claimed.user,
            dueDate: taskDue,
            recurringTaskId: claimed._id,
            recurrenceDate: localDateStr,
            reminderInterval,
            reminderEnabled: reminderInterval > 0,
            nextReminderAt: reminderInterval > 0 ? new Date(Date.now() + reminderInterval * 60 * 60 * 1000) : null,
          };

          try {
            task = await Task.create(taskData);
            isNewlyCreated = true;
          } catch (createErr) {
            // If duplicate key error due to race condition, retrieve the existing task
            if (createErr.code === 11000) {
              task = await Task.findOne({
                recurringTaskId: claimed._id,
                recurrenceDate: localDateStr,
              });
            } else {
              throw createErr;
            }
          }
        }

        // Only send creation notification if newly created
        if (isNewlyCreated && task) {
          // 1. In-App Notification
          try {
            await Notification.create({
              recipient: claimed.user,
              sender: null,
              type: 'task_created',
              task: task._id,
              message: `Your daily "${claimed.title}" task has been created. Time to get started!`,
            });
          } catch (notifErr) {
            console.error('[Recurring Scheduler] Notification error:', notifErr.message);
          }

          // 2. Web Push Notification
          try {
            await pushService.sendPushToUser(claimed.user, {
              title: 'PunchUp',
              body: `Your daily "${claimed.title}" task has been created. Time to get started!`,
              icon: '/assets/logo.png',
              badge: '/assets/logo.png',
              data: {
                url: '/tasks',
                taskId: task._id.toString(),
              },
              tag: `recurring-task-${claimed._id}-${localDateStr}`,
            });
          } catch (pushErr) {
            console.error('[Recurring Scheduler] Push error:', pushErr.message);
          }

          generatedCount++;
        }

        // Calculate next run time for tomorrow at the configured creation time
        const nextRun = computeNextRunAt(
          claimed.creationTime,
          claimed.timeZone,
          new Date(now.getTime() + 60 * 1000), // Slight offset to ensure next day calculation
          localDateStr
        );

        claimed.lastGeneratedDate = localDateStr;
        claimed.lastGeneratedAt = now;
        claimed.nextRunAt = nextRun;
        await claimed.save();
      } catch (scheduleErr) {
        console.error(`[Recurring Scheduler] Error processing schedule ${schedule._id}:`, scheduleErr.message);
      }
    }

    isProcessing = false;
    return generatedCount;
  } catch (err) {
    isProcessing = false;
    console.error('[Recurring Scheduler] Error in checkAndGenerateRecurringTasks:', err.message);
    return 0;
  }
};

/**
 * Start the background recurring task scheduler
 */
const startRecurringScheduler = (intervalMs = 30000) => {
  if (recurringSchedulerInterval) {
    clearInterval(recurringSchedulerInterval);
  }

  console.log(`[Recurring Scheduler] Scheduler started (interval: ${intervalMs}ms).`);

  // Run initial check 3 seconds after startup to catch up on any due tasks
  setTimeout(() => {
    checkAndGenerateRecurringTasks().catch(() => {});
  }, 3000);

  recurringSchedulerInterval = setInterval(() => {
    checkAndGenerateRecurringTasks().catch(() => {});
  }, intervalMs);

  if (recurringSchedulerInterval.unref) {
    recurringSchedulerInterval.unref();
  }
};

/**
 * Stop the background recurring task scheduler
 */
const stopRecurringScheduler = () => {
  if (recurringSchedulerInterval) {
    clearInterval(recurringSchedulerInterval);
    recurringSchedulerInterval = null;
    console.log('[Recurring Scheduler] Scheduler stopped.');
  }
};

/**
 * Generates task for a single schedule idempotently and updates the schedule document.
 * Returns the generated task (or null if already generated/skipped).
 *
 * @param {Object} schedule - RecurringTask document
 * @param {Date} now - Current timestamp
 * @returns {Promise<Object|null>}
 */
const generateTaskForSchedule = async (schedule, now = new Date()) => {
  const localDateStr = getLocalDateString(now, schedule.timeZone);

  // Idempotency: Check if task for this recurring schedule and local calendar date already exists
  let task = await Task.findOne({
    recurringTaskId: schedule._id,
    recurrenceDate: localDateStr,
  });

  let isNewlyCreated = false;

  if (!task) {
    const taskDue = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const reminderInterval = schedule.reminderInterval || 0;

    const taskData = {
      title: schedule.title,
      description: schedule.description || '',
      priority: schedule.priority || 'medium',
      category: schedule.category || 'general',
      user: schedule.user,
      dueDate: taskDue,
      recurringTaskId: schedule._id,
      recurrenceDate: localDateStr,
      reminderInterval,
      reminderEnabled: reminderInterval > 0,
      nextReminderAt: reminderInterval > 0 ? new Date(Date.now() + reminderInterval * 60 * 60 * 1000) : null,
    };

    try {
      task = await Task.create(taskData);
      isNewlyCreated = true;
    } catch (createErr) {
      if (createErr.code === 11000) {
        task = await Task.findOne({
          recurringTaskId: schedule._id,
          recurrenceDate: localDateStr,
        });
      } else {
        throw createErr;
      }
    }
  }

  // Only send creation notification if newly created
  if (isNewlyCreated && task) {
    try {
      await Notification.create({
        recipient: schedule.user,
        sender: null,
        type: 'task_created',
        task: task._id,
        message: `Your daily "${schedule.title}" task has been created. Time to get started!`,
      });
    } catch (notifErr) {
      console.error('[Recurring Scheduler] Notification error:', notifErr.message);
    }

    try {
      await pushService.sendPushToUser(schedule.user, {
        title: 'Daily Task Created 🎯',
        body: `Your daily "${schedule.title}" task has been created. Time to get started!`,
        icon: '/assets/logo.png',
        badge: '/assets/logo.png',
        data: {
          url: '/tasks',
          taskId: task._id.toString(),
        },
        tag: `recurring-created-${schedule._id}-${localDateStr}`,
      });
    } catch (pushErr) {
      console.error('[Recurring Scheduler] Push error:', pushErr.message);
    }
  }

  // Calculate next run time for tomorrow at the configured creation time
  const nextRun = computeNextRunAt(
    schedule.creationTime,
    schedule.timeZone,
    new Date(now.getTime() + 60 * 1000),
    localDateStr
  );

  schedule.lastGeneratedDate = localDateStr;
  schedule.lastGeneratedAt = now;
  schedule.nextRunAt = nextRun;
  await schedule.save();

  return isNewlyCreated ? task : null;
};

module.exports = {
  checkAndGenerateRecurringTasks,
  generateTaskForSchedule,
  startRecurringScheduler,
  stopRecurringScheduler,
};
