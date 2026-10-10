const User = require("../models/User");
const FriendRequest = require("../models/friendRequest");
const Notification = require("../models/Notification");

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

        const alreadyFriends =  req.user.friend.some(
            (id) => id.toString() === receiverId.toString()
        )

        if(alreadyFriends){
            return res.status(400).json({
                message:"2 bạn đã là bạn bè!"
            })
        }
        const existingRequest = await FriendRequest.findOne({
            senderId,
            receiverId,
            status:"pending"
        })

        if(existingRequest){
            return res.status(400).json({
                message:"Bạn đã gửi lời mời kết bạn cho người này!"
            })
        }

        const reverseRequest = await FriendRequest.findOne({
            senderId: receiverId,
            receiverId: req.user._id,
            status: "pending",
            username: User.username
        });

        if(reverseRequest){
            return res.status(400).json({
                message:"Người này đã gửi lời mời kết bạn cho bạn!"
            })
        }

        const friendRequest = await FriendRequest.create(
            {
                senderId,
                receiverId
            }
        );

        await Notification.create({
            recipientId: receiverId,
            senderId,
            type:"friend_request",
            friendRequestId: friendRequest._id
        })
        res.status(201).json({
            message:"Đã gửi lời mời kết bạn!",
            friendRequest
        });
    }catch (error) {
        res.status(400).json({
            message: error.message,
        });
    }
}
const getReceivedRequest = async (req, res) =>{
    try{
        const request = await FriendRequest.find({
            receiverId: req.user._id,
            status:"pending"
        }).populate("senderId","username profilePicture")
        .sort({ createdAt: -1});

        res.status(200).json({
            request,
        })
    } catch (err){
        res.status(500).json({
            message: err.message,
        });
    }
}
const acceptFriendRequest = async (req,res) =>{
    try{
        const request = await FriendRequest.findById(req.params.id);

        if(!request){
            return res.status(200).json({
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

        request.status = "accepted";
        await request.save();

        await User.findByIdAndUpdate(request.senderId, {
            $addToSet:{
                friend: request.receiverId
            }
        })

        await User.findByIdAndUpdate(request.receiverId, {
            $addToSet:{
                friend: request.senderId
            }
        })
        await Notification.create({
            recipientId: request.senderId,
            senderId: request.receiverId,
            type:"friend_accepted",
            friendRequest: request._id
        })
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
            return res.status(200).json({
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

        request.status = "rejected";
        await request.save();

        res.status(200).json({
            message:"Bạn đã từ chối lời mời kết bạn!",
            FriendRequest: request,
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
        .populate("friend", "username profilePicture bio");

        if (!user) {
            return res.status(404).json({
                message: "Không tìm thấy người dùng!",
            });
        }

        res.status(200).json({
            friend: user.friend,
        })
    } catch (error) {
        console.error(error);

        res.status(400).json({
        message: error.message,
    });
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
