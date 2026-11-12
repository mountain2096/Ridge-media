const User = require("../models/User");
const FriendRequest = require("../models/FriendRequest");
const Conversation = require("../models/Conversation")

const searchUsers = async (req, res) => {
    try {
        if (req.query.q !== undefined && typeof req.query.q !== "string") {
            return res.status(400).json({ message: "Từ khóa tìm kiếm không hợp lệ!" });
        }
        const query = (req.query.q || "").trim();
        const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const incomingRequests = await FriendRequest.find({
            receiverId: req.user._id,
            status: "pending",
        }).select("senderId");
        const excludedIds = [
            req.user._id,
            ...req.user.friend,
            ...req.user.blockList,
            ...incomingRequests.map((request) => request.senderId),
        ];

        const users = await User.find({
            _id: { $nin: excludedIds },
            username: { $regex: escapedQuery, $options: "i" },
            blockList: { $ne: req.user._id },
        })
            .select("username profilePicture bio")
            .limit(20)
            .sort({ username: 1 });

        const outgoingRequests = await FriendRequest.find({
            senderId: req.user._id,
            status: "pending",
        }).select("receiverId");
        const pendingUserIds = new Set(
            outgoingRequests.map((request) => request.receiverId.toString())
        );

        res.status(200).json({
            users: users.map((user) => ({
                ...user.toObject(),
                hasPendingRequest: pendingUserIds.has(user._id.toString()),
            })),
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getMe = async (req,res) =>{
    try{
        const user = await User.findById(req.user.id)
            .select("-password -resetPasswordToken -resetPasswordExpires");

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

const getBlockedUsers = async (req, res) => {
    try {
        const user = await User.findById(req.user._id)
            .populate("blockList", "username profilePicture");
        if (!user) {
            return res.status(404).json({ message: "Không tìm thấy người dùng!" });
        }
        res.status(200).json({ blockedUsers: user.blockList.filter(Boolean) });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const updateMe = async (req, res) =>{
    try{
        const {username, bio, profilePicture, coverPicture} = req.body;

        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({
                message: "Không tìm thấy người dùng!",
            });
        }
        if (bio !== undefined && (typeof bio !== "string" || bio.length > 255)) {
            return res.status(400).json({
                message: "Phần giới thiệu tối đa 255 ký tự!",
            });
        }
        if (profilePicture !== undefined && typeof profilePicture !== "string") {
            return res.status(400).json({ message: "Đường dẫn ảnh đại diện không hợp lệ!" });
        }
        if (coverPicture !== undefined && typeof coverPicture !== "string") {
            return res.status(400).json({ message: "Đường dẫn ảnh bìa không hợp lệ!" });
        }
        if (username !== undefined) {
            if (typeof username !== "string" || !username.trim()) {
                return res.status(400).json({
                    message: "Tên người dùng không được để trống!",
                });
            }
            const normalizedUsername = username.trim();
            const escapedUsername = normalizedUsername.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            const existingUser = await User.findOne({
                username: { $regex: `^${escapedUsername}$`, $options: "i" },
                _id: {$ne: user._id}
            });

            if (existingUser) {
                return res.status(400).json({
                    message: "Tên người dùng đã được sử dụng!",
                });
            }
            user.username = normalizedUsername;
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
        const user = await User.findById(req.params.id)
            .select("-password -email -resetPasswordToken -resetPasswordExpires");

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
    searchUsers,
    getMe, 
    getBlockedUsers,
    updateMe,
    getUserById,
    block,
    unblock,
}
