const express = require("express");
const protect = require("../middlewares/authMiddleware");
const {
  getNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
  getVapidPublicKey,
  subscribePush,
  unsubscribePush,
} = require("../controllers/notificationController");

const router = express.Router();

router.get("/", protect, getNotifications);
router.get("/unread-count", protect, getUnreadCount);
router.get("/vapid-public-key", protect, getVapidPublicKey);
router.post("/push-subscription", protect, subscribePush);
router.delete("/push-subscription", protect, unsubscribePush);
router.patch("/read-all", protect, markAllAsRead);
router.patch("/:id/read", protect, markAsRead);

module.exports = router;
