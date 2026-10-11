const express = require("express");

const {
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
} = require("../controllers/taskController");

const protect = require("../middlewares/authMiddleware");
const { creationLimiter, completeTaskLimiter } = require("../middlewares/rateLimitMiddleware");

const router = express.Router();

router.post("/", protect, creationLimiter, createTask);

router.get("/", protect, getTasks);

// Recurring tasks management routes (before /:id)
router.get("/recurring", protect, getRecurringTasks);
router.post("/recurring", protect, creationLimiter, createRecurringSchedule);
router.put("/recurring/:id", protect, updateRecurringSchedule);
router.delete("/recurring/:id", protect, deleteRecurringSchedule);
router.post("/recurring/trigger-check", protect, triggerRecurringCheck);

router.get("/archived", protect, getArchivedTasks);

router.put("/:id", protect, updateTask);

router.delete("/:id", protect, deleteTask);

router.patch("/:id/complete", protect, completeTaskLimiter, completeTask);

module.exports = router;