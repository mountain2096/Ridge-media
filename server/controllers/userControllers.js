const errorResponse = require("../utils/errorResponse");
const User = require("../models/User");
const FriendRequest = require("../models/FriendRequest");
const Conversation = require("../models/Conversation")
const validateMediaUrl = require("../utils/validateMediaUrl");

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
            isLocked: { $ne: true },
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
        return errorResponse(res, error);
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
        return errorResponse(res, err);
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
        return errorResponse(res, error);
    }
};

const updateMe = async (req, res) =>{
    try{
        const {username, bio, profilePicture, coverPicture, dateOfBirth} = req.body;

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
        if (!validateMediaUrl(profilePicture, req)) {
            return res.status(400).json({ message: "Ảnh đại diện phải là URL hợp lệ từ máy chủ tải lên của chúng tôi." });
        }
        if (!validateMediaUrl(coverPicture, req)) {
            return res.status(400).json({ message: "Ảnh bìa phải là URL hợp lệ từ máy chủ tải lên của chúng tôi." });
        }
        if (dateOfBirth !== undefined) {
            const parsedDate = dateOfBirth === null || dateOfBirth === "" ? null : new Date(dateOfBirth);
            if (parsedDate && (Number.isNaN(parsedDate.getTime()) || parsedDate > new Date())) {
                return res.status(400).json({ message: "Ngày sinh không hợp lệ!" });
            }
            user.dateOfBirth = parsedDate;
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
                dateOfBirth: user.dateOfBirth,
                isAdmin: user.isAdmin,
            },
        });
    }catch (error) {
        return errorResponse(res, error);
    }
}
const getUserById = async (req,res) =>{
    try{
        const user = await User.findById(req.params.id)
            .select("username profilePicture coverPicture bio createdAt friend blockList")
            .populate("friend", "username profilePicture");

        if(!user){
            return res.status(404).json({
                message:"Người dùng không tồn tại!"
            })
        }

        const viewerId = req.user._id.toString();
        const targetId = user._id.toString();
        const viewerBlockedTarget = (req.user.blockList || []).some((id) => id.toString() === targetId);
        const targetBlockedViewer = (user.blockList || []).some((id) => id.toString() === viewerId);
        if (viewerBlockedTarget || targetBlockedViewer) {
            return res.status(404).json({ message: "Người dùng không tồn tại!" });
        }

        const [outgoingRequest, incomingRequest] = targetId === viewerId ? [null, null] : await Promise.all([
            FriendRequest.findOne({ senderId: req.user._id, receiverId: user._id, status: "pending" }).select("_id"),
            FriendRequest.findOne({ senderId: user._id, receiverId: req.user._id, status: "pending" }).select("_id"),
        ]);
        const profile = user.toObject();
        profile.friendCount = user.friend.length;
        delete profile.friend;
        delete profile.blockList;
        profile.friends = user.friend.filter(Boolean).slice(0, 9).map((friend) => ({
            _id: friend._id,
            username: friend.username,
            profilePicture: friend.profilePicture,
        }));
        return res.status(200).json({
            user: profile,
            relationship: {
                isSelf: targetId === viewerId,
                isFriend: (req.user.friend || []).some((id) => id.toString() === targetId),
                hasSentRequest: Boolean(outgoingRequest),
                hasReceivedRequest: Boolean(incomingRequest),
                incomingRequestId: incomingRequest?._id || null,
            },
        });
    } catch(err){
        if (err.name === "CastError") return res.status(400).json({ message: "ID người dùng không hợp lệ!" });
        return errorResponse(res, err);
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
        return errorResponse(res, err);
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
        return errorResponse(res, err);
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
