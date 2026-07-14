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

const router = express.Router();

router.post("/", protect, createTask);

router.get("/", protect, getTasks);

router.get("/archived", protect, getArchivedTasks);

router.put("/:id", protect, updateTask);

router.delete("/:id", protect, deleteTask);

router.patch("/:id/complete", protect, completeTask);

module.exports = router;