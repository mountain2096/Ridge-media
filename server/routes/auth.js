const express = require("express");

const { register, login, createGoogleAuthController, forgotPassword, resetPassword, changePassword, logout } = require("../controllers/authControllers");
const protect = require("../middlewares/protect");
const { login: loginLimiter, googleAuth: googleAuthLimiter, register: registerLimiter, forgotPassword: forgotPasswordLimiter, resetPassword: resetPasswordLimiter } = require("../middleware/rateLimiters");

const router = express.Router();

router.post("/register", registerLimiter, register);
router.post("/login", loginLimiter, login);
router.post("/google", googleAuthLimiter, createGoogleAuthController());
router.post("/forgot-password", forgotPasswordLimiter, forgotPassword);
router.post("/reset-password/:token", resetPasswordLimiter, resetPassword)
router.post("/change-password", protect, changePassword);
router.post("/logout", protect, logout);
module.exports = router;
