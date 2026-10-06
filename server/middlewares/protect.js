const jwt = require("jsonwebtoken");
const User = require("../models/User");

const protect = async (req,res,next) =>{
    try{
        const authHeader = req.headers.authorization;

        if(!authHeader || !authHeader.startsWith("Bearer ")){
            return res.status(401).json({
                message:"Yêu cầu xác thực!"
            })
        }
        const token = authHeader.split(" ")[1];

        const decoded = jwt.verify(
            token, 
            process.env.JWt_SECRET
        );

        const user = await User.findById(decoded.id).select("-password");

        if(!user){
            return res.status(401).json({
                message:"Không tìm thấy người dùng!"
            })
        }
        req.user=user;

        next();
    } catch(error){
        return res.status(401).json({
            message:"Token không hợp lệ hoặc token hết hạn!",
        })
    }
}
module.exports = protect;