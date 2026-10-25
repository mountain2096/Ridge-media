const { randomBytes, createHash } = require("node:crypto");
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const bcrypt = require("bcryptjs");

const transport = nodemailer.createTransport({
    service: "gmail",
    auth:{
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
})

const register = async (req, res) =>{
    try{
        const {username, email, password} = req.body;

        if(typeof username !== "string" || !username.trim() ||
           typeof email !== "string" || !email.trim() ||
           typeof password !== "string" || !password){
            return res.status(400).json({
                message:"Vui lòng điền đầy đủ thông tin!",
            })
        }
        const normalizedEmail = email.trim().toLowerCase();

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
            return res.status(400).json({ message: "Email không hợp lệ!" });
        }

        if(typeof password !== "string" || password.length < 6){
            return res.status(400).json({
                message:"Mật khẩu ít nhất 6 ký tự"
            })
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
        console.error(error);
        res.status(500).json({
            message: error.message
        })
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
            return res.status(404).json({
                message:"Email hoặc password không đúng!"
            })
        }

        const isPasswordCorrect = await bcrypt.compare(password, user.password);

        if(!isPasswordCorrect){
            return res.status(401).json({
                message:"Email hoặc mật khẩu không đúng!"
            })
        }
        const token = jwt.sign({
            id:user._id,
            isAdmin: user.isAdmin,
        },process.env.JWT_SECRET,
        {
            expiresIn:"7d",
        })

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
        res.status(500).json({
            message: err.message
        })
    }
}
const forgotPassword = async (req, res) =>{
    try{
        const { email } = req.body;

        if(typeof email !== "string" || !email.trim()){
            return res.status(400).json({
                message:"Vui lòng nhập email"
            })
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
            return res.status(400).json({ message: "Email không hợp lệ!" });
        }

        const user = await User.findOne({
            email: email.trim().toLowerCase()
        })
        if(!user){
            return res.status(200).json({ message:"Email chưa được đăng ký" });
        }

        const message =  "Đã gửi đường dẫn đặt lại mật khẩu đến gmail!";
        const resetToken = randomBytes(32).toString("hex");

        user.resetPasswordToken = 
        createHash("sha256")
        .update(resetToken)
        .digest("hex");
         user.resetPasswordExpires = Date.now() + 15 * 60 * 1000;

        await user.save();

        
        const resetURL =
            `${process.env.CLIENT_URL || "http://localhost:5173"}` +
            `/reset-password/${resetToken}`;


        try {
            await transport.sendMail({
                from: process.env.EMAIL_USER,
                to: user.email,
                subject: "Đặt lại mật khẩu",
                text: `Truy cập liên kết sau để đặt lại mật khẩu: ${resetURL}\nLiên kết hết hạn sau 15 phút.`
            });
        } catch (emailError) {
            user.resetPasswordToken = null;
            user.resetPasswordExpires = null;
            await user.save();

            throw emailError;
        }

        return res.status(200).json({ message });
    } catch (err) {
        console.error(err);

        return res.status(500).json({
            message: "Không thể gửi email đặt lại mật khẩu!"
        });
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
        if (password.length < 6) {
            return res.status(400).json({
            message: "Mật khẩu phải có ít nhất 6 ký tự!!"
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

        user.resetPasswordToken = null;
        user.resetPasswordExpires = null;

        await user.save();

        return res.status(200).json({
            message: "Đặt lại mật khẩu thành công!"
        });
    } catch (err) {
        return res.status(500).json({
            message: err.message
        });
    }
};
module.exports = {
    register,
    login,
    resetPassword,
    forgotPassword
}
