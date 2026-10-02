const Task = require('../models/Task');
const Notification = require('../models/Notification');
const pushService = require('./pushService');

let schedulerInterval = null;
let isProcessing = false;

/**
 * Checks database for tasks that are due for a reminder and sends them
 * Returns number of reminders processed
 */
const checkAndSendReminders = async () => {
  if (isProcessing) return 0;
  isProcessing = true;

  try {
    const now = new Date(Date.now());

    // Query active tasks that have reminders enabled and are due
    const dueTasks = await Task.find({
      reminderEnabled: true,
      completed: false,
      isDeleted: { $ne: true },
      nextReminderAt: { $lte: now },
    });

    if (!dueTasks || dueTasks.length === 0) {
      isProcessing = false;
      return 0;
    }

    let processedCount = 0;

    for (const task of dueTasks) {
      try {
        // Atomic lease/claim to prevent duplicate processing across concurrent workers or ticks
        const claimed = await Task.findOneAndUpdate(
          {
            _id: task._id,
            reminderEnabled: true,
            completed: false,
            isDeleted: { $ne: true },
            nextReminderAt: { $lte: now },
          },
          {
            $set: {
              // Temporary 5-minute lease while processing
              nextReminderAt: new Date(Date.now() + 5 * 60 * 1000),
              lastReminderSentAt: now,
            },
          },
          { new: true }
        );

        if (!claimed) continue;

        // 1. Create In-App Notification
        await Notification.create({
          recipient: claimed.user,
          sender: null,
          type: 'task_reminder',
          task: claimed._id,
          message: `Reminder: ${claimed.title}`,
        });

        // 2. Send Browser Push Notification via Web Push API
        await pushService.sendPushToUser(claimed.user, {
          title: 'PunchUp',
          body: `Reminder: ${claimed.title}`,
          icon: '/assets/logo.png',
          badge: '/assets/logo.png',
          data: {
            url: '/tasks',
            taskId: claimed._id.toString(),
          },
          tag: `task-reminder-${claimed._id}`,
        });

        // 3. Compute next reminder time based on configured interval
        const intervalHours = claimed.reminderInterval || 0;
        if (intervalHours > 0) {
          const intervalMs = intervalHours * 60 * 60 * 1000;
          const nextTime = new Date(now.getTime() + intervalMs);

          // If next reminder would fall past task dueDate, stop scheduling further reminders
          if (claimed.dueDate && nextTime.getTime() > new Date(claimed.dueDate).getTime()) {
            claimed.reminderEnabled = false;
            claimed.nextReminderAt = null;
          } else {
            claimed.nextReminderAt = nextTime;
          }
        } else {
          claimed.reminderEnabled = false;
          claimed.nextReminderAt = null;
        }

        await claimed.save();
        processedCount++;
      } catch (taskErr) {
        console.error(`[Reminder Scheduler] Error processing task ${task._id}:`, taskErr.message);
      }
    }

    isProcessing = false;
    return processedCount;
  } catch (err) {
    isProcessing = false;
    console.error('[Reminder Scheduler] Error in checkAndSendReminders:', err.message);
    return 0;
  }
};

/**
 * Start the background reminder scheduler
 */
const startScheduler = (intervalMs = 30000) => {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
  }

  console.log(`[Reminder Scheduler] Scheduler started (interval: ${intervalMs}ms).`);

  // Run an initial check after brief startup delay
  setTimeout(() => {
    checkAndSendReminders().catch(() => {});
  }, 2000);

  schedulerInterval = setInterval(() => {
    checkAndSendReminders().catch(() => {});
  }, intervalMs);

  if (schedulerInterval.unref) {
    schedulerInterval.unref();
  }
};

/**
 * Stop the background reminder scheduler
 */
const stopScheduler = () => {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log('[Reminder Scheduler] Scheduler stopped.');
  }
};

module.exports = {
  checkAndSendReminders,
  startScheduler,
  stopScheduler,
};
