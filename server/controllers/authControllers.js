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

        if(!username || !email || !password){
            return res.status(400).json({
                message:"Vui lòng điền đầy đủ thông tin!",
            })
        }
        const normalizedEmail = email.trim().toLowerCase();

        if(typeof password !== "string" || password.length < 8){
            return res.status(400).json({
                message:"Mật khẩu ít nhất 8 ký tự"
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
            username,
            email,
            password: hashedPassword
        })

        res.status(200).json({
            message:"Đăng kí thành công!",
            user:{
                id: user._id,
                username: user.username,
                email: user.email
            }
        });
    } catch(error){
        console.error(error);
        res.status(500).json({
            message: error.message
        })
    }
}


const login = async(req,res) =>{
    try{
        const {email, password} = req.body;

        if(!email||!password){
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

        if(!email){
            return res.status(400).json({
                message:"Vui long nhap email"
            })
        }

        const user = await User.findOne({
            email: email.trim().toLowerCase()
        })

        const message =  "Neu email da dang ky, huong dan dat lai mat khau se duoc gui.";

        if(!user){
            return res.status(200).json({ message });
        }

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
                subject: "Dat lai mat khau Ridge",
                text: `Truy cap lien ket sau de dat lai mat khau: ${resetURL}\nLien ket het han sau 15 phut.`
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
            message: "Khong the gui email dat lai mat khau!"
        });
    }
};
const resetPassword = async (req, res) => {
    try {
        const { password, confirmPassword } = req.body;

        if (!password || !confirmPassword) {
            return res.status(400).json({
                message: "Vui long nhap day du mat khau!"
            });
        }

        if (password !== confirmPassword) {
            return res.status(400).json({
                message: "Mat khau xac nhan khong khop!"
            });
        }
        if (password.length < 8) {
            return res.status(400).json({
            message: "Mat khau phai co it nhat 8 ky tu!"
            });
        }

        // Băm token nhận từ liên kết để đối chiếu database
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
                message: "Token khong hop le hoac da het han!"
            });
        }

        // Băm mật khẩu mới giống cách đăng ký
        user.password = await bcrypt.hash(password, 10);

        // Xóa token để không thể sử dụng lại
        user.resetPasswordToken = null;
        user.resetPasswordExpires = null;

        await user.save();

        return res.status(200).json({
            message: "Dat lai mat khau thanh cong!"
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
