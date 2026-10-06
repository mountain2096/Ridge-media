const bcrypt = require("bcryptjs");
const User = require("../models/User");
const jwt = require("jsonwebtoken");

// Đăng kí
const register = async (req, res) =>{
    try{
        const {username, email, password} = req.body;

        if(!username || !email || !password){
            return res.status(400).json({
                message:"Vui lòng điền đầy đủ thông tin!",
            })
        }
        const existingUser = await User.findOne({email});
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

// Đăng nhập
const login = async(req,res) =>{
    try{
        const {email, password} = req.body;

        if(!email||!password){
            return res.status(400).json({
                message:"Vui lòng nhập email và mật khẩu!"
            })
        }

        const user = await User.findOne({email});

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
module.exports = {
    register,
    login
}