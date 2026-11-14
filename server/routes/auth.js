const express = require("express");

const { register, login, forgotPassword, resetPassword, changePassword } = require("../controllers/authControllers");
const protect = require("../middlewares/protect");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword)
router.post("/change-password", protect, changePassword);
module.exports = router;
