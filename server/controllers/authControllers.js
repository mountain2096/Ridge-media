const { randomBytes, createHash } = require("node:crypto");
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const mailer = require("../config/mailer");
const bcrypt = require("bcryptjs");
const errorResponse = require("../utils/errorResponse");
const { OAuth2Client } = require("google-auth-library");

const googleClient = new OAuth2Client();

const validatePassword = (password) => typeof password === "string" && password.length >= 8 &&
    /[a-z]/.test(password) && /[A-Z]/.test(password) && /\d/.test(password);

const signAuthToken = (user) => jwt.sign({
    id: user._id,
    isAdmin: user.isAdmin,
    tv: user.tokenVersion || 0,
}, process.env.JWT_SECRET, { expiresIn: "7d" });

const createGoogleAuthController = (verifyIdToken = (options) => googleClient.verifyIdToken(options)) => async (req, res) => {
    if (!process.env.GOOGLE_CLIENT_ID) {
        return res.status(503).json({ message: "Đăng nhập Google chưa được cấu hình trên máy chủ." });
    }
    if (typeof req.body?.credential !== "string" || !req.body.credential) {
        return res.status(401).json({ message: "Thông tin đăng nhập Google không hợp lệ." });
    }

    let payload;
    try {
        const ticket = await verifyIdToken({ idToken: req.body.credential, audience: process.env.GOOGLE_CLIENT_ID });
        payload = ticket.getPayload();
    } catch {
        return res.status(401).json({ message: "Thông tin đăng nhập Google không hợp lệ." });
    }
    if (!payload?.email_verified || typeof payload.email !== "string") {
        return res.status(401).json({ message: "Email Google chưa được xác minh." });
    }

    try {
        const email = payload.email.trim().toLowerCase();
        let user = await User.findOne({ email });
        if (user?.isLocked) {
            return res.status(403).json({ message: "Tài khoản của bạn hiện đã bị vô hiệu hóa" });
        }
        if (!user) {
            const base = (payload.name || email.split("@")[0]).trim().slice(0, 32) || "Ridge user";
            let username = base;
            while (await User.findOne({ username })) username = `${base.slice(0, 32)}-${randomBytes(3).toString("hex")}`;
            let profilePicture = "";
            try {
                if (new URL(payload.picture).protocol === "https:") profilePicture = payload.picture;
            } catch {}
            user = await User.create({
                username, email, password: await bcrypt.hash(randomBytes(32).toString("hex"), 10), profilePicture,
            });
        }
        return res.status(200).json({
            message: "Đăng nhập thành công!",
            token: signAuthToken(user),
            user: { id: user._id, email: user.email, username: user.username },
        });
    } catch (error) {
        return errorResponse(res, error);
    }
};

const register = async (req, res) =>{
    try{
        const {username, email, password, confirmPassword} = req.body;

        if(typeof username !== "string" || !username.trim() ||
           typeof email !== "string" || !email.trim() ||
           typeof password !== "string" || !password || typeof confirmPassword !== "string" || !confirmPassword){
            return res.status(400).json({
                message:"Vui lòng điền đầy đủ thông tin!",
            })
        }
        const normalizedEmail = email.trim().toLowerCase();

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
            return res.status(400).json({ message: "Email không hợp lệ!" });
        }

        if (!validatePassword(password)) {
            return res.status(400).json({
                message:"Mật khẩu cần ít nhất 8 ký tự, gồm chữ hoa, chữ thường và số."
            })
        }
        if (password !== confirmPassword) {
            return res.status(400).json({ message: "Mật khẩu xác nhận không khớp!" });
        }
        const existingUser = await User.findOne({ email: normalizedEmail });
        if(existingUser){
            return res.status(400).json({
                message: "Email đã được sử dụng!"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await User.create({
            username: username.trim(),
            email: normalizedEmail,
            password: hashedPassword
        })

        res.status(201).json({
            message:"Đăng kí thành công!",
            user:{
                id: user._id,
                username: user.username,
                email: user.email
            }
        });
    } catch(error){
        if (error.code === 11000) {
            return res.status(400).json({ message: "Email đã được sử dụng!" });
        }
        return errorResponse(res, error);
    }
}


const login = async(req,res) =>{
    try{
        const {email, password} = req.body;

        if(typeof email !== "string" || !email.trim() ||
           typeof password !== "string" || !password){
            return res.status(400).json({
                message:"Vui lòng nhập email và mật khẩu!"
            })
        }

        const user = await User.findOne({email: email.trim().toLowerCase()});

        if(!user){
            return res.status(401).json({
                message:"Email hoặc password không đúng!"
            })
        }

        const isPasswordCorrect = await bcrypt.compare(password, user.password);



        if(!isPasswordCorrect){
            return res.status(401).json({
                message:"Email hoặc mật khẩu không đúng!"
            })
        }

        if (user.isLocked) {
            return res.status(403).json({
                message: "Tài khoản của bạn hiện đã bị vô hiệu hóa"
            });
        }
        const token = signAuthToken(user);

        res.status(200).json({
            message:"Đăng nhập thành công!",
            token,
            user:{
                id: user._id,
                email:user.email,
                username:user.username,
            }
        });
    } catch(err){
        return errorResponse(res, err);
    }
}
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (typeof email !== "string" || !email.trim()) {
            return res.status(400).json({ message: "Please enter an email address." });
        }
        const normalizedEmail = email.trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
            return res.status(400).json({ message: "Please enter a valid email address." });
        }

        const user = await User.findOne({ email: normalizedEmail });
        if (user) {
            const resetToken = randomBytes(32).toString("hex");
            user.resetPasswordToken = createHash("sha256").update(resetToken).digest("hex");
            user.resetPasswordExpires = Date.now() + 15 * 60 * 1000;
            await user.save();
            const resetURL = (process.env.CLIENT_URL || "http://localhost:5173").replace(/\/+$/, "") + "/reset-password/" + resetToken;
            try {
                await mailer.sendPasswordResetEmail(user.email, resetURL);
            } catch {
                user.resetPasswordToken = null;
                user.resetPasswordExpires = null;
                await user.save();
            }
        }
        return res.status(200).json({ message: "Nếu email này đã đăng ký, chúng tôi đã gửi liên kết đặt lại mật khẩu. Vui lòng kiểm tra hộp thư đến và cả mục Thư rác (liên kết hết hạn sau 15 phút)." });
    } catch (error) {
        return errorResponse(res, error);
    }
};
const resetPassword = async (req, res) => {
    try {
        const { password, confirmPassword } = req.body;

        if (typeof password !== "string" || typeof confirmPassword !== "string" ||
            !password || !confirmPassword) {
            return res.status(400).json({
                message: "Vui lòng nhập đầy đủ mật khẩu!"
            });
        }

        if (password !== confirmPassword) {
            return res.status(400).json({
                message: "Mật khẩu xác nhận không khớp!"
            });
        }
        if (!validatePassword(password)) {
            return res.status(400).json({
            message: "Mật khẩu cần ít nhất 8 ký tự, gồm chữ hoa, chữ thường và số."
            });
        }
        const hashedToken = 
            createHash("sha256")
            .update(req.params.token)
            .digest("hex");

        const user = await User.findOne({
            resetPasswordToken: hashedToken,
            resetPasswordExpires: { $gt: new Date() }
        });

        if (!user) {
            return res.status(400).json({
                message: "Token hết hạn!"
            });
        }
        user.password = await bcrypt.hash(password, 10);
        user.tokenVersion = (user.tokenVersion || 0) + 1;

        user.resetPasswordToken = null;
        user.resetPasswordExpires = null;

        await user.save();

        return res.status(200).json({
            message: "Đặt lại mật khẩu thành công!"
        });
    } catch (err) {
        return errorResponse(res, err);
    }
};

const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword, confirmPassword } = req.body;
        if (typeof currentPassword !== "string" || !currentPassword ||
            typeof newPassword !== "string" || !newPassword ||
            typeof confirmPassword !== "string" || !confirmPassword) {
            return res.status(400).json({ message: "Vui lòng nhập đầy đủ mật khẩu!" });
        }
        if (!validatePassword(newPassword)) {
            return res.status(400).json({ message: "Mật khẩu cần ít nhất 8 ký tự, gồm chữ hoa, chữ thường và số." });
        }
        if (newPassword !== confirmPassword) {
            return res.status(400).json({ message: "Mật khẩu xác nhận không khớp!" });
        }
        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ message: "Không tìm thấy người dùng!" });
        if (!(await bcrypt.compare(currentPassword, user.password))) {
            return res.status(401).json({ message: "Mật khẩu hiện tại không đúng!" });
        }
        user.password = await bcrypt.hash(newPassword, 10);
        user.tokenVersion = (user.tokenVersion || 0) + 1;
        user.resetPasswordToken = null;
        user.resetPasswordExpires = null;
        await user.save();
        return res.status(200).json({ message: "Đổi mật khẩu thành công!", token: signAuthToken(user) });
    } catch (error) {
        return errorResponse(res, error);
    }
};

const logout = async (req, res) => {
    try {
        await User.updateOne({ _id: req.user._id }, { $inc: { tokenVersion: 1 } });
        return res.status(200).json({ message: "Đăng xuất thành công!" });
    } catch (error) {
        return errorResponse(res, error);
    }
};

module.exports = {
    register,
    login,
    createGoogleAuthController,
    resetPassword,
    forgotPassword,
    changePassword,
    logout,
}
