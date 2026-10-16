const User = require("../models/User");
const FriendRequest = require("../models/FriendRequest");
const Conversation = require("../models/Conversation")

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
            });

            if (existingUser) {
                return res.status(400).json({
                    message: "Tên người dùng đã được sử dụng!",
                });
            }
            user.username = username;
        } 
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
const block = async (req, res) =>{
    try{
        const userId = req.user._id;
        const blockedUser = await User.findById(req.params.userId);

        if(!blockedUser){
            return res.status(400).json({
                message:"không tìm thấy người dùng"
            })
        }

        const isMe = blockedUser._id.toString() === userId.toString()

        if(isMe){
            return res.status(400).json({
                message:"không thể tự chặn chính mình!"
            })
        }

        const isBlocked = req.user.blockList.some(
            (id) => id.toString() === blockedUser._id.toString()
        );

        if(isBlocked){
            return res.status(400).json({
                message:"Người dùng này đã trong danh sách chặn!"
            })
        }

        await User.findByIdAndUpdate(
            userId,
            { $addToSet: {blockList: blockedUser._id}}
        )

        await FriendRequest.deleteMany({
            status:"pending",
            $or:[
                {
                    senderId: userId,
                    receiverId: blockedUser._id
                },
                {
                    senderId:blockedUser._id,
                    receiverId:userId
                }
            ]
        }
        )

        const user = await User.findById(userId)

        user.friend = user.friend.filter(
            (id) => id.toString() !== blockedUser._id.toString()
        )

        blockedUser.friend = blockedUser.friend.filter(
            (id) => id.toString() !== userId.toString()
        )

        await user.save();
        await blockedUser.save();

        await Conversation.updateOne(
        {
            participants: {
                $all: [userId, blockedUser._id],
                $size: 2,
            },
        },
        {
            $addToSet: {
                hiddenFor: {
                    $each: [userId, blockedUser._id],
                },
            },
        }
    );
        res.status(200).json({
            message:"đã chặn người dùng này!",
        })
    } catch(err){
        return res.status(500).json({
            message: err.message
        })
    }
}
const unblock = async (req, res) => {
    try {
        const userId = req.user._id;

        const blockedUserId = await User.findById(req.params.userId);

        if (!blockedUserId) {
            return res.status(404).json({
                message: "Nguoi dung khong ton tai!"
            });
        }
        const isBlocked = req.user.blockList.some(
            (id) => id.toString() === blockedUserId._id.toString()
        );

        if (!isBlocked) {
            return res.status(400).json({
                message: "Nguoi dung nay chua bi chan!"
            });
        }


        await User.findByIdAndUpdate(
            userId,
            { $pull: { blockList: blockedUserId._id } }
        );


        const isBlockedBack = blockedUserId.blockList.some(
            (id) => id.toString() === userId.toString()
        );


        if (!isBlockedBack) {
            await Conversation.updateOne(
                {
                    participants: {
                        $all: [userId, blockedUserId._id],
                        $size: 2
                    }
                },
                {
                    $pull: {
                        hiddenFor: {
                            $in: [userId, blockedUserId._id]
                        }
                    }
                }
            );
        }

        return res.status(200).json({
            message: "Bo chan thanh cong!"
        });
    } catch (err) {
        return res.status(500).json({
            message: err.message
        });
    }
};

module.exports = {
    getMe, 
    updateMe,
    getUserById,
    block,
    unblock,
}
