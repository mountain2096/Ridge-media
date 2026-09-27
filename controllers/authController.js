const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// 1. ĐĂNG KÝ (REGISTER)
const registerUser = async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // Kiểm tra xem email hoặc username đã tồn tại chưa
        const existingUser = await User.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            return res.status(400).json({ message: "Email hoặc Tên người dùng đã tồn tại!" });
        }

        // BÃM MẬT KHẨU (HASH PASSWORD) trước khi lưu
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Tạo người dùng mới với mật khẩu đã được mã hóa
        const newUser = new User({
            username,
            email,
            password: hashedPassword,
        });

        const savedUser = await newUser.save();
        
        // Ẩn mật khẩu trước khi trả về kết quả cho client
        const { password: _, ...userData } = savedUser._doc;
        res.status(201).json(userData);

    } catch (error) {
        res.status(500).json({ message: "Lỗi Server: " + error.message });
    }
};

// 2. ĐĂNG NHẬP (LOGIN)
const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Tìm người dùng theo email
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: "Tài khoản không tồn tại!" });
        }

        // So sánh mật khẩu nhập vào với mật khẩu đã hash trong DB
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(400).json({ message: "Mật khẩu không chính xác!" });
        }

        // Tạo JWT Token để xác thực các phiên sau
        const token = jwt.sign(
            { id: user._id, isAdmin: user.isAdmin },
            process.env.JWT_SECRET || 'fallback_secret',
            { expiresIn: '7d' }
        );

        // Ẩn mật khẩu trước khi trả về
        const { password: _, ...userData } = user._doc;
        res.status(200).json({ ...userData, token });

    } catch (error) {
        res.status(500).json({ message: "Lỗi Server: " + error.message });
    }
};

module.exports = { registerUser, loginUser };