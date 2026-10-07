const User = require("../models/User")

const getMe = async (req,res) =>{
    try{
        const user = await User.findById(req.user.id).select("-password");

        if(!user){
            return res.status(404).json({
                message:"Không tìm thấy người dùng!"
            })
        }

        res.status(200).json({
            user,
        })
    } catch(err){
        res.status(500).json({
            message: err.message,
        })
    }
}

const updateMe = async (req, res) =>{
    try{
        const {username, bio, profilePicture, coverPicture} = req.body;

        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({
                message: "Không tìm thấy người dùng!",
            });
        }
        if(username !== undefined){
            const existingUser = await User.findOne({
                username,
                _id: {$ne: user._id}
            })
        } 
        user.username = username;
        if(bio !== undefined){
            user.bio = bio;
        }
        if (profilePicture !== undefined) {
            user.profilePicture = profilePicture;
        }

        if (coverPicture !== undefined) {
            user.coverPicture = coverPicture;
        }

        await user.save();
        res.status(200).json({
            message: "Cập nhật profile thành công!",
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                profilePicture: user.profilePicture,
                coverPicture: user.coverPicture,
                bio: user.bio,
                isAdmin: user.isAdmin,
            },
        });
    }catch (error) {
        res.status(500).json({
            message: error.message,
        });
    }
}
const getUserById = async (req,res) =>{
    try{
        const user = await User.findById(req.params.id).select("-password -email");

        if(!user){
            return res.status(404).json({
                message:"Người dùng không tồn tại!"
            })
        }

        res.status(200).json({
            user,
        })
    } catch(err){
        res.status(400).json({
            message: err.message
        })
    }
}
module.exports = {
    getMe, 
    updateMe,
    getUserById,
}