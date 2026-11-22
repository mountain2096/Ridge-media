const Conversation = require("../models/Conversation");
const User = require("../models/User");
const Message = require("../models/Message");
const Notification = require("../models/Notification");
const errorResponse = require("../utils/errorResponse");
const { emitToUser } = require("../utils/realtime");
const { isStickerId, STICKER_PREVIEW } = require("../utils/stickers");

const idString = (value) => (value?._id || value).toString();

const isBlockedBetween = (userId, otherUser, currentUser) => {
    const userIdString = idString(userId);
    return (currentUser.blockList || []).some((id) => idString(id) === idString(otherUser._id)) ||
        (otherUser.blockList || []).some((id) => id.toString() === userIdString);
};

const getOtherParticipant = (conversation, userId) => conversation.participants.find(
    (id) => idString(id) !== idString(userId)
);

const rejectIfBlocked = async (conversation, req, res) => {
    const otherId = getOtherParticipant(conversation, req.user._id);
    if (!otherId) {
        res.status(400).json({ message: "Cuộc trò chuyện không hợp lệ!" });
        return true;
    }
    const otherUser = await User.findById(otherId).select("blockList");
    if (!otherUser || isBlockedBetween(req.user._id, otherUser, req.user)) {
        res.status(403).json({ message: "Không thể nhắn tin khi một trong hai người đã chặn người còn lại!" });
        return true;
    }
    return false;
};

const createOrGetConversation = async (req, res) => {
    try {
        const senderId = req.user._id;
        // const senderName = req.user.username;

        const receiverId = req.params.userId;
        // const receiverName = req.params.username;
        if (senderId.toString() === receiverId.toString()) {
            return res.status(400).json({
                message: "Bạn không thể tạo cuộc trò chuyện với chính mình!",
            });
        }

        const receiver = await User.findById(receiverId);

        if (!receiver) {
            return res.status(404).json({
                message: "Không tìm thấy người dùng!",
            });
        }

        if (isBlockedBetween(senderId, receiver, req.user)) {
            return res.status(403).json({
                message: "Không thể nhắn tin khi một trong hai người đã chặn người còn lại!",
            });
        }

        const isFriend = req.user.friend.some(
            (id) => id.toString() === receiverId.toString()
        );

        if (!isFriend) {
            return res.status(403).json({
                message: "Bạn chỉ có thể nhắn tin với bạn bè!",
            });
        }

        const existingConversation = await Conversation.findOne({
            participants: {
                $all: [senderId, receiverId],
                $size: 2,
            },
            hiddenFor: { $ne: senderId },
        }).populate("participants","username profilePicture");
        
        if (existingConversation) {
            return res.status(200).json({
                message: "Cuộc trò chuyện đã tồn tại!",
                conversation: existingConversation,
            });
        }

        const conversation = await Conversation.create({
            participants: [senderId, receiverId],
        });

        await conversation.populate("participants", "username profilePicture")
        res.status(201).json({
            message: "Tạo cuộc trò chuyện thành công!",
            conversation,
        });
    } catch (error) {
        if (error.name === "CastError") {
            return res.status(400).json({
                message: "ID người dùng không hợp lệ!",
            });
        }

        return errorResponse(res, error);
    }
};
const sendMessage = async (req, res) => {
    try {
        const { content, stickerId } = req.body;
        const { conversationId } = req.params;
        const isSticker = stickerId !== undefined && stickerId !== null;

        if (isSticker) {
            if (!isStickerId(stickerId)) {
                return res.status(400).json({
                    message: "Nhãn dán không hợp lệ!",
                });
            }
        } else if (typeof content !== "string" || !content.trim()) {
            return res.status(400).json({
                message: "Nội dung tin nhắn không được để trống!",
            });
        }

        const conversation = await Conversation.findById(conversationId);

        if (!conversation) {
            return res.status(404).json({
                message: "Không tìm thấy cuộc trò chuyện!",
            });
        }

        const isParticipant = conversation.participants.some(
            (id) => id.toString() === req.user._id.toString()
        );

        if (!isParticipant) {
            return res.status(403).json({
                message: "Bạn không thuộc cuộc trò chuyện này!",
            });
        }

        if (conversation.hiddenFor.some((id) => id.toString() === req.user._id.toString())) {
            return res.status(404).json({
                message: "Không tìm thấy cuộc trò chuyện!",
            });
        }

        if (await rejectIfBlocked(conversation, req, res)) return;

        const newMessage = await Message.create({
            conversationId: conversation._id,
            senderId: req.user._id,
            ...(isSticker
                ? { type: "sticker", stickerId, content: STICKER_PREVIEW }
                : { content: content.trim() }),
        });

        conversation.lastMessage = newMessage._id;
        await conversation.save();

        await newMessage.populate(
            "senderId",
            "username profilePicture"
        );

        const receiverId = conversation.participants.find(
            (id) => id.toString() !== req.user._id.toString()
        )

        if(receiverId){
            try {
                await Notification.create({
                    recipientId: receiverId,
                    senderId: req.user._id,
                    type: "message",
                });
            } catch (notificationError) {
                console.error("Could not create message notification:", notificationError);
            }
        }

        // Realtime push: the receiver sees the message instantly, and the
        // sender's other open tabs stay in sync (clients de-duplicate by _id).
        const realtimePayload = {
            conversationId: conversation._id.toString(),
            message: newMessage.toObject(),
        };
        if (receiverId) emitToUser(receiverId, "message:new", realtimePayload);
        emitToUser(req.user._id, "message:new", realtimePayload);

        res.status(201).json({
            message: "Gửi tin nhắn thành công!",
            newMessage,
        });
    } catch (error) {
        if (error.name === "CastError") {
            return res.status(400).json({
                message: "ID cuộc trò chuyện không hợp lệ!",
            });
        }

        return errorResponse(res, error);
    }
};
const getMessage = async (req, res) =>{
    try{
        const { conversationId } = req.params;
        const conversation = await Conversation.findById(conversationId);

        if(!conversation){
            return res.status(400).json({
                message:"Không tìm thấy cuộc trò chuyện!"
            })
        }

        const isParticipant = conversation.participants.some(
        (id) => id.toString() === req.user._id.toString()
    );

        if (!isParticipant) {
            return res.status(403).json({
                message: "Bạn không thuộc cuộc trò chuyện này!",
            });
        }

        if (conversation.hiddenFor.some((id) => id.toString() === req.user._id.toString())) {
            return res.status(404).json({
                message: "Không tìm thấy cuộc trò chuyện!",
            });
        }

        if (await rejectIfBlocked(conversation, req, res)) return;

        const message = await Message.find({conversationId})
        .populate("senderId", "username profilePicture")
        .sort({ createdAt: 1})

        res.status(200).json({
            message,
        })
    } catch (error) {
    if (error.name === "CastError") {
        return res.status(400).json({
            message: "ID cuộc trò chuyện không hợp lệ!",
        });
    }

    return errorResponse(res, error);
}
}
const getConversations = async (req, res) =>{
    try{
        const userId = req.user._id;

        const conversations = await Conversation.find({
            participants: userId,
            hiddenFor: {$ne: userId }
        })
        .populate("participants","username profilePicture")
        .populate({
            path:"lastMessage",
            populate:{
                path:"senderId",
                select:"username profilePicture"
            }
        }).sort({ updatedAt: -1})

        const otherIds = conversations.map((item) => getOtherParticipant(item, userId)).filter(Boolean);
        const otherUsers = await User.find({ _id: { $in: otherIds } }).select("_id blockList");
        const otherUserById = new Map(otherUsers.map((user) => [idString(user._id), user]));
        const visibleConversations = conversations.filter((item) => {
            const otherId = getOtherParticipant(item, userId);
            const otherUser = otherId && otherUserById.get(idString(otherId));
            return otherUser && !isBlockedBetween(userId, otherUser, req.user);
        });

        const conversationWithUnreadCount = await Promise.all(
            visibleConversations.map(async (conversation) =>{
                const unreadCount = await Message.countDocuments({
                    conversationId: conversation._id,
                    senderId:{$ne: userId},
                    isRead: false
                });

                return {
                    ...conversation.toObject(),
                    unreadCount,
                }
            })
        )

        res.status(200).json({
            conversations: conversationWithUnreadCount
        })
    }catch (error) {
            return errorResponse(res, error);
        }
    };
const markMessageIsRead = async (req, res) =>{
    try{
        const { conversationId } = req.params;
    
        const conversation = await Conversation.findById(conversationId);

        if(!conversation){
            return res.status(400).json({
                message:"conversation not found!"
            })
        }

        const isParticipant = conversation.participants.some(
        (id) => id.toString() === req.user._id.toString()
        )
        if (!isParticipant) {
            return res.status(403).json({
                message: "Bạn không thuộc cuộc trò chuyện này!",
            });
        }

        if (conversation.hiddenFor.some((id) => id.toString() === req.user._id.toString())) {
            return res.status(404).json({
                message: "Không tìm thấy cuộc trò chuyện!",
            });
        }

        if (await rejectIfBlocked(conversation, req, res)) return;

        const readAt = new Date();
        const result = await Message.updateMany(
            {
                conversationId,
                senderId: {$ne: req.user._id},
                isRead: false,
            },
            {
                $set: {isRead: true, readAt}
            }
        )
        if (Number(result.modifiedCount) > 0) {
            // Tell the other participant their messages were seen.
            emitToUser(getOtherParticipant(conversation, req.user._id), "message:read", {
                conversationId: conversation._id.toString(),
                readerId: req.user._id.toString(),
                readAt: readAt.toISOString(),
            });
        }
        return res.status(200).json({
            message:"Đã đọc",
            ModifiedCount: result.modifiedCount,
        })
    } catch (error) {
        if (error.name === "CastError") {
            return res.status(400).json({
                message: "ID cuộc trò chuyện không hợp lệ!",
            });
        }

        return errorResponse(res, error);
    }
}

module.exports = {
    createOrGetConversation,
    sendMessage,
    getMessage,
    getConversations,
    markMessageIsRead,
};
