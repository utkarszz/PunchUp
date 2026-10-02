const Task = require('../models/Task');

/**
 * Migration utility to safely backfill any legacy tasks that lack a dueDate.
 * If createdAt is present, dueDate is set to createdAt + 24 hours.
 * Otherwise, dueDate is set to 24 hours from the current time.
 * Completed tasks keep completed = true and are never marked overdue.
 */
const migrateTaskDueDates = async () => {
  try {
    const tasksWithoutDueDate = await Task.find({
      $or: [
        { dueDate: { $exists: false } },
        { dueDate: null }
      ]
    });

    if (!tasksWithoutDueDate || tasksWithoutDueDate.length === 0) {
      return { success: true, count: 0 };
    }

    let modifiedCount = 0;
    for (const task of tasksWithoutDueDate) {
      const baseTime = task.createdAt ? new Date(task.createdAt).getTime() : Date.now();
      const calculatedDueDate = new Date(baseTime + 24 * 60 * 60 * 1000);

      await Task.findByIdAndUpdate(task._id, {
        $set: { dueDate: calculatedDueDate }
      });
      modifiedCount++;
    }

    console.log(`[Migration] Backfilled due dates for ${modifiedCount} tasks.`);
    return { success: true, count: modifiedCount };
  } catch (error) {
    console.error('[Migration] Failed to migrate task due dates:', error.message);
    throw error;
  }
};

module.exports = migrateTaskDueDates;
