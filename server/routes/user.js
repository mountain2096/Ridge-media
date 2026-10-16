const express = require("express");

const { getMe, updateMe, getUserById, block, unblock } = require("../controllers/userControllers");

const protect = require("../middlewares/protect");
const router = express.Router();

router.get("/me",protect, getMe);
router.put("/me",protect, updateMe);
router.get("/:id", protect, getUserById);
router.post("/block/:userId",protect, block);
router.post("/unblock/:userId",protect, unblock)
module.exports = router;