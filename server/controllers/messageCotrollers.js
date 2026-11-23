const Conversation = require("../models/Conversation");
const mongoose = require("mongoose");
const User = require("../models/User");
const Message = require("../models/Message");
const errorResponse = require("../utils/errorResponse");
const { emitToUser } = require("../utils/realtime");
const { isStickerId, STICKER_PREVIEW } = require("../utils/stickers");
const CHAT_MEDIA_PATH = /^\/uploads\/[0-9a-f-]{36}\.(jpg|png|webp|gif|mp4|webm)$/;
const SHARE_PREVIEW = "Đã chia sẻ một bài viết";

async function findOrCreateConversation(senderId, receiverId) {
    let conversation = await Conversation.findOne({ participants: { $all: [senderId, receiverId], $size: 2 }, hiddenFor: { $ne: senderId } });
    if (!conversation) conversation = await Conversation.create({ participants: [senderId, receiverId] });
    return conversation;
}

async function createAndEmitMessage(conversation, senderId, receiverId, data) {
    const newMessage = await Message.create({ conversationId: conversation._id, senderId, ...data });
    conversation.lastMessage = newMessage._id;
    await conversation.save();
    await newMessage.populate("senderId", "username profilePicture");
    if (newMessage.type === "post_share") await newMessage.populate({ path: "sharedPostId", select: "authorId content image video status", populate: { path: "authorId", select: "username profilePicture" } });
    const payload = { conversationId: conversation._id.toString(), message: newMessage.toObject() };
    emitToUser(receiverId, "message:new", payload);
    emitToUser(senderId, "message:new", payload);
    return newMessage;
}

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
        const { content, stickerId, mediaUrl } = req.body;
        const { conversationId } = req.params;
        const isSticker = stickerId !== undefined && stickerId !== null;
        const hasMedia = Object.hasOwn(req.body, "mediaUrl");
        let mediaType;

        if (hasMedia) {
            try {
                const url = new URL(mediaUrl);
                const requestHost = req.get?.("host") || req.headers?.host;
                const rawPath = typeof mediaUrl === "string" && mediaUrl.match(/^https?:\/\/[^/?#]+(\/[^?#]*)$/i)?.[1];
                const extension = CHAT_MEDIA_PATH.exec(rawPath || "")?.[1];
                if (typeof mediaUrl !== "string" || !requestHost || !["http:", "https:"].includes(url.protocol) ||
                    url.origin !== new URL(`${req.protocol}://${requestHost}`).origin || url.username || url.password ||
                    url.search || url.hash || !extension) throw new Error();
                mediaType = ["mp4", "webm"].includes(extension) ? "video" : "image";
            } catch {
                return res.status(400).json({ message: "Tệp đính kèm không hợp lệ!" });
            }
        }

        if (isSticker && hasMedia) {
            return res.status(400).json({ message: "Tệp đính kèm không hợp lệ!" });
        }

        if (isSticker) {
            if (!isStickerId(stickerId)) {
                return res.status(400).json({
                    message: "Nhãn dán không hợp lệ!",
                });
            }
        } else if (!hasMedia && (typeof content !== "string" || !content.trim())) {
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

        const receiverId = conversation.participants.find(
            (id) => id.toString() !== req.user._id.toString()
        )
        const newMessage = await createAndEmitMessage(conversation, req.user._id, receiverId, isSticker
            ? { type: "sticker", stickerId, content: STICKER_PREVIEW }
            : hasMedia
                ? { type: mediaType, mediaUrl, content: mediaType === "image" ? "Đã gửi một ảnh" : "Đã gửi một video" }
                : { content: content.trim() });

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
        .populate({ path: "sharedPostId", select: "authorId content image video status privacy", populate: { path: "authorId", select: "username profilePicture" } })
        .sort({ createdAt: 1})

        for (const item of message) {
            if (item.sharedPostId && item.sharedPostId.status !== "active") item.sharedPostId = null;
            else if (item.sharedPostId) {
                const { canAccessPost } = require("../utils/postAccess");
                if (!await canAccessPost(req.user, item.sharedPostId)) item.sharedPostId = null;
            }
        }

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
                const isMuted = (conversation.mutedBy || []).some((id) => idString(id) === idString(userId));
                const unreadCount = isMuted ? 0 : await Message.countDocuments({
                    conversationId: conversation._id,
                    senderId:{$ne: userId},
                    isRead: false
                });

                return {
                    ...conversation.toObject(),
                    unreadCount,
                    isMuted,
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

const updateNickname = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const { userId, nickname } = req.body;
        if (typeof nickname !== "string" || nickname.trim().length > 40 || !mongoose.isValidObjectId(userId)) {
            return res.status(400).json({ message: "Biệt danh không hợp lệ!" });
        }
        const conversation = await Conversation.findById(conversationId);
        if (!conversation) return res.status(404).json({ message: "Không tìm thấy cuộc trò chuyện!" });
        if (!conversation.participants.some((id) => idString(id) === idString(req.user._id)) ||
            !conversation.participants.some((id) => idString(id) === idString(userId))) {
            return res.status(403).json({ message: "Bạn không thuộc cuộc trò chuyện này!" });
        }
        conversation.nicknames = (conversation.nicknames || []).filter((item) => idString(item.user) !== idString(userId));
        if (nickname.trim()) conversation.nicknames.push({ user: userId, nickname: nickname.trim() });
        await conversation.save();
        const otherId = getOtherParticipant(conversation, req.user._id);
        emitToUser(otherId, "conversation:updated", {
            conversationId: idString(conversation._id),
            nicknames: conversation.nicknames,
            isMuted: (conversation.mutedBy || []).some((id) => idString(id) === idString(otherId)),
        });
        return res.status(200).json({ nicknames: conversation.nicknames });
    } catch (error) {
        if (error.name === "CastError") return res.status(400).json({ message: "ID không hợp lệ!" });
        return errorResponse(res, error);
    }
};

const setConversationMute = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const { muted } = req.body;
        if (typeof muted !== "boolean") return res.status(400).json({ message: "Trạng thái thông báo không hợp lệ!" });
        const conversation = await Conversation.findById(conversationId);
        if (!conversation) return res.status(404).json({ message: "Không tìm thấy cuộc trò chuyện!" });
        if (!conversation.participants.some((id) => idString(id) === idString(req.user._id))) {
            return res.status(403).json({ message: "Bạn không thuộc cuộc trò chuyện này!" });
        }
        conversation.mutedBy = (conversation.mutedBy || []).filter((id) => idString(id) !== idString(req.user._id));
        if (muted) conversation.mutedBy.push(req.user._id);
        await conversation.save();
        return res.status(200).json({ isMuted: muted });
    } catch (error) {
        if (error.name === "CastError") return res.status(400).json({ message: "ID cuộc trò chuyện không hợp lệ!" });
        return errorResponse(res, error);
    }
};

const setConversationQuickIcon = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const { icon } = req.body;
        const isEmoji = typeof icon === "string" && icon.length <= 8 && (!icon || /^(?=.*(?:\p{Extended_Pictographic}|\p{Regional_Indicator}|[#*0-9]\uFE0F?\u20E3))(?:\p{Extended_Pictographic}|\p{Regional_Indicator}|\p{Emoji_Modifier}|\uFE0F|\u200D|[#*0-9]\uFE0F?\u20E3)+$/u.test(icon));
        if (!isEmoji) return res.status(400).json({ message: "Biểu tượng nhanh không hợp lệ!" });
        const conversation = await Conversation.findById(conversationId);
        if (!conversation) return res.status(404).json({ message: "Không tìm thấy cuộc trò chuyện!" });
        if (!conversation.participants.some((id) => idString(id) === idString(req.user._id))) {
            return res.status(403).json({ message: "Bạn không thuộc cuộc trò chuyện này!" });
        }
        conversation.quickIcon = icon;
        await conversation.save();
        emitToUser(getOtherParticipant(conversation, req.user._id), "conversation:updated", {
            conversationId: idString(conversation._id), quickIcon: conversation.quickIcon,
            isMuted: (conversation.mutedBy || []).some((id) => idString(id) === idString(getOtherParticipant(conversation, req.user._id))),
        });
        return res.status(200).json({ quickIcon: conversation.quickIcon });
    } catch (error) {
        if (error.name === "CastError") return res.status(400).json({ message: "ID cuộc trò chuyện không hợp lệ!" });
        return errorResponse(res, error);
    }
};

const CHAT_BACKGROUNDS = ["mint", "sky", "peach", "lavender", "sunset", "night", "paper", "pink", "snow", "starry"];
const CHAT_BUBBLE_STYLES = ["cat-dog", "frog", "pink-heart", "sky-fish", "duck", "sketch", "dark", "snow", "starry", "ghost", "berry"];

const setConversationAppearance = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const { background, bubbleStyle } = req.body;
        if ((!Object.hasOwn(req.body, "background") && !Object.hasOwn(req.body, "bubbleStyle")) ||
            (Object.hasOwn(req.body, "background") && !["", ...CHAT_BACKGROUNDS].includes(background)) ||
            (Object.hasOwn(req.body, "bubbleStyle") && !["", ...CHAT_BUBBLE_STYLES].includes(bubbleStyle))) {
            return res.status(400).json({ message: "Giao diện cuộc trò chuyện không hợp lệ!" });
        }
        const conversation = await Conversation.findById(conversationId);
        if (!conversation) return res.status(404).json({ message: "Không tìm thấy cuộc trò chuyện!" });
        if (!conversation.participants.some((id) => idString(id) === idString(req.user._id))) {
            return res.status(403).json({ message: "Bạn không thuộc cuộc trò chuyện này!" });
        }
        if (background !== undefined) conversation.background = background;
        if (bubbleStyle !== undefined) conversation.bubbleStyle = bubbleStyle;
        await conversation.save();
        const otherId = getOtherParticipant(conversation, req.user._id);
        const appearance = {
            conversationId: idString(conversation._id), background: conversation.background, bubbleStyle: conversation.bubbleStyle,
            isMuted: (conversation.mutedBy || []).some((id) => idString(id) === idString(otherId)),
        };
        emitToUser(otherId, "conversation:updated", appearance);
        return res.status(200).json({ background: conversation.background, bubbleStyle: conversation.bubbleStyle });
    } catch (error) {
        if (error.name === "CastError") return res.status(400).json({ message: "ID cuộc trò chuyện không hợp lệ!" });
        return errorResponse(res, error);
    }
};

module.exports = {
    createOrGetConversation,
    sendMessage,
    findOrCreateConversation,
    createAndEmitMessage,
    SHARE_PREVIEW,
    getMessage,
    getConversations,
    markMessageIsRead,
    updateNickname,
    setConversationMute,
    setConversationQuickIcon,
    setConversationAppearance,
};
