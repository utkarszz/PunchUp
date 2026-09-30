const express = require("express");

const {
  createTask,
  getTasks,
  updateTask,
  deleteTask,
  completeTask,
  getArchivedTasks,
} = require("../controllers/taskController");

const protect = require("../middlewares/authMiddleware");
const { creationLimiter, completeTaskLimiter } = require("../middlewares/rateLimitMiddleware");

const router = express.Router();

router.post("/", protect, creationLimiter, createTask);

router.get("/", protect, getTasks);

router.get("/archived", protect, getArchivedTasks);

router.put("/:id", protect, updateTask);

router.delete("/:id", protect, deleteTask);

router.patch("/:id/complete", protect, completeTaskLimiter, completeTask);

module.exports = router;