const express = require("express");
const protect = require("../middlewares/authMiddleware");
const adminOnly = require("../middlewares/adminMiddleware");
const {
  getAllUsers,
  adminDeleteUser,
  adminBanUser,
  adminUnbanUser,
} = require("../controllers/adminController");

const router = express.Router();

// All routes require authentication and admin privileges
router.use(protect);
router.use(adminOnly);

router.get("/users", getAllUsers);
router.delete("/users/:userId", adminDeleteUser);
router.post("/users/:userId/ban", adminBanUser);
router.post("/users/:userId/unban", adminUnbanUser);

module.exports = router;
