const express = require("express");

const { getMe, updateMe, getUserById } = require("../controllers/userControllers");

const protect = require("../middlewares/protect");
const router = express.Router();

router.get("/me",protect, getMe);
router.put("/me",protect, updateMe);
router.get("/:id", protect, getUserById);
module.exports = router;