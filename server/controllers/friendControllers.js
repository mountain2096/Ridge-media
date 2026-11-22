const User = require("../models/User");
const FriendRequest = require("../models/FriendRequest");
const Notification = require("../models/Notification");
const errorResponse = require("../utils/errorResponse");

const sendFriendRequest = async (req, res) =>{
    try{
        const senderId = req.user._id;
        const receiverId = req.params.userId;

        if(senderId.toString() === receiverId.toString()){
            return res.status(400).json({
                message:"Không thể gửi lời mời kết bạn cho chính mình!"
            })
        }

        const receiver = await User.findById(receiverId);

        if(!receiver){
            return res.status(404).json({
                message:"Tài khoản này không tồn tại!"
            })
        }

        const senderBlockedReceiver = req.user.blockList.some(
            (id) => id.toString() === receiverId.toString()
        )
        const receiverBlockedSender =   receiver.blockList.some(
            (id) => id.toString() === senderId.toString()
        )

        if(senderBlockedReceiver || receiverBlockedSender){
            return res.status(400).json({
                message:"đang nằm trong danh sách chặn!"
            })
        }
        const alreadyFriends = req.user.friend.some(
            (id) => id.toString() === receiverId.toString()
        ) || receiver.friend.some(
            (id) => id.toString() === senderId.toString()
        );

        if(alreadyFriends){
            return res.status(409).json({
                message:"Hai bạn đã là bạn bè!"
            })
        }
        const existingRequest = await FriendRequest.findOne({
            status: "pending",
            $or: [
                { senderId, receiverId },
                { senderId: receiverId, receiverId: senderId },
            ],
        });

        if(existingRequest){
            return res.status(409).json({
                message:"Lời mời kết bạn giữa hai người đang chờ xử lý!"
            })
        }

        const friendRequest = await FriendRequest.create(
            {
                senderId,
                receiverId
            }
        );

        try {
            await Notification.create({
                recipientId: receiverId,
                senderId,
                type: "friend_request",
                friendRequestId: friendRequest._id,
            });
        } catch (notificationError) {
            console.error("Could not create friend request notification:", notificationError);
        }
        res.status(201).json({
            message:"Đã gửi lời mời kết bạn!",
            friendRequest
        });
    }catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                message: "Lời mời kết bạn giữa hai người đang chờ xử lý!",
            });
        }
        if (error.name === "CastError") return res.status(400).json({ message: "ID người dùng không hợp lệ!" });
        return errorResponse(res, error);
    }
}
const getReceivedRequest = async (req, res) =>{
    try{
        const requests = await FriendRequest.find({
            receiverId: req.user._id,
            status:"pending"
        }).populate("senderId","username profilePicture")
        .sort({ createdAt: -1});

        const latestRequestBySender = new Map();
        for (const request of requests) {
            const senderId = request.senderId?._id?.toString()
                || request.senderId?.toString()
                || request._id.toString();
            if (!latestRequestBySender.has(senderId)) {
                latestRequestBySender.set(senderId, request);
            }
        }

        res.status(200).json({
            request: [...latestRequestBySender.values()],
        })
    } catch (err){
        return errorResponse(res, err);
    }
}
const acceptFriendRequest = async (req,res) =>{
    try{
        const request = await FriendRequest.findById(req.params.id);

        if(!request){
            return res.status(404).json({
                message:"Lời mời kết bạn không tồn tại!"
            })
        }

        if(request.receiverId.toString() !== req.user._id.toString()){
            return res.status(403).json({
                message: "Bạn không có quyền chấp nhận lời mời này!",
            });
        }

        if(request.status !== "pending"){
             return res.status(400).json({
                message: "Lời mời này đã được xử lý!",
            });
        }

        await Promise.all([
            User.findByIdAndUpdate(request.senderId, {
                $addToSet: { friend: request.receiverId },
            }),
            User.findByIdAndUpdate(request.receiverId, {
                $addToSet: { friend: request.senderId },
            }),
        ]);

        request.status = "accepted";
        await request.save();
        try {
            await Notification.create({
                recipientId: request.senderId,
                senderId: request.receiverId,
                type: "friend_accept",
                friendRequestId: request._id,
            });
        } catch (notificationError) {
            console.error("Could not create friend acceptance notification:", notificationError);
        }
        res.status(200).json({
            message: "Đã chấp nhận lời mời kết bạn!",
            friendRequest: request,
        });
    } catch(err){
        res.status(400).json({
            message: "ID lời mời không hợp lệ!",
        });
    }
}
const rejectFriendRequest = async (req, res) =>{
    try{
        const request = await FriendRequest.findById(req.params.id);

        if(!request){
            return res.status(404).json({
                message:"Lời mời kết bạn không tồn tại!"
            })
        }

        if(request.receiverId.toString() !== req.user._id.toString()){
            return res.status(403).json({
                message: "Bạn không có quyền từ chối lời mời này!",
            });
        }

        if(request.status !== "pending"){
             return res.status(400).json({
                message: "Lời mời này đã được xử lý!",
            });
        }

        request.status = "rejected";
        await request.save();

        res.status(200).json({
            message:"Bạn đã từ chối lời mời kết bạn!",
            friendRequest: request,
        })
    } catch(err){
        res.status(400).json({
            message: "ID lời mời không hợp lệ!",
        });
    }
}
const getListFriend = async (req, res) =>{
    try{
        const user = await User.findById(req.user._id)
        .populate("friend", "username profilePicture bio lastActiveAt");

        if (!user) {
            return res.status(404).json({
                message: "Không tìm thấy người dùng!",
            });
        }

        const now = Date.now();
        const friend = user.friend.filter(Boolean).map((item) => {
            const data = typeof item.toObject === "function" ? item.toObject() : { ...item };
            const lastActiveAt = data.lastActiveAt ? new Date(data.lastActiveAt).getTime() : NaN;
            delete data.lastActiveAt;
            return {
                ...data,
                isOnline: Number.isFinite(lastActiveAt) && lastActiveAt <= now && lastActiveAt >= now - 2 * 60_000,
            };
        });

        res.status(200).json({ friend });
    } catch (error) {
        if (error.name === "CastError") return res.status(400).json({ message: "ID người dùng không hợp lệ!" });
        return errorResponse(res, error);
    }
}
const unFriend = async (req, res) =>{
     try {
        const userId = req.user._id;
        const friendId = req.params.userId;

        if (userId.toString() === friendId.toString()) {
            return res.status(400).json({
                message: "Không thể xóa chính mình khỏi danh sách bạn bè!",
            });
        }

        const user = await User.findById(userId);
        const friends = await User.findById(friendId);

        if (!friends) {
            return res.status(404).json({
                message: "Không tìm thấy người dùng!",
            });
        }

        const isFriend = user.friend.some(
            (id) => id.toString() === friendId.toString()
        );

        if (!isFriend) {
            return res.status(400).json({
                message: "Hai người không phải bạn bè!",
            });
        }

        user.friend = user.friend.filter(
            (id) => id.toString() !== friendId.toString()
        );

        friends.friend = friends.friend.filter(
            (id) => id.toString() !== userId.toString()
        );

        await user.save();
        await friends.save();

        res.status(200).json({
            message: "Đã hủy kết bạn!",
        });
    } catch (error) {
        res.status(400).json({
            message: "ID người dùng không hợp lệ!",
        });
    }
}
module.exports = {
    sendFriendRequest,
    getReceivedRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    getListFriend,
    unFriend,
}
