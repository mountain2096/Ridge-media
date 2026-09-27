const router = require('express').Router();
const { registerUser, loginUser } = require('../controllers/authController');

// Đường dẫn đăng ký: POST /api/auth/register
router.post('/register', registerUser);

// Đường dẫn đăng nhập: POST /api/auth/login
router.post('/login', loginUser);

module.exports = router;