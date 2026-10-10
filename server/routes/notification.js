const express = require("express");

const {
    getNotification,
    markNotificationIsRead,
} = require ("../controllers/notificationController");

const protect = require("../middlewares/protect");

const router = express.Router();

router.get("/", protect, getNotification);
router.patch("/:id/read", protect, markNotificationIsRead)

module.exports = router;