const express = require("express");

const {
    getNotification,
    markNotificationIsRead,
    markAllNotificationsAsRead,
    deleteNotification,
    deleteAllNotifications,
} = require ("../controllers/notificationController");

const protect = require("../middlewares/protect");

const router = express.Router();

router.get("/", protect, getNotification);
router.patch("/read-all", protect, markAllNotificationsAsRead);
router.delete("/", protect, deleteAllNotifications);
router.delete("/:id", protect, deleteNotification);
router.patch("/:id/read", protect, markNotificationIsRead);

module.exports = router;
