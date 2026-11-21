const express = require("express");
const protect = require("../middlewares/protect");
const requireAdmin = require("../middlewares/requireAdmin");
const { listUsers, lockUser, unlockUser, listReports, updateReport, getStats } = require("../controllers/adminControllers");

const router = express.Router();
router.use(protect, requireAdmin);
router.get("/users", listUsers);
router.patch("/users/:userId/lock", lockUser);
router.patch("/users/:userId/unlock", unlockUser);
router.get("/stats", getStats);
router.get("/reports", listReports);
router.patch("/reports/:reportId", updateReport);

module.exports = router;
