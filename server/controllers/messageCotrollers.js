const Conversation = require("../models/Conversation");
const User = require("../models/User");
const Message = require("../models/Message");

const createOrGetConversation = async (req, res) => {
    try {
        const senderId = req.user._id;
        const receiverId = req.params.userId;

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

        const isFriend = req.user.friends.some(
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
        });

        if (existingConversation) {
            return res.status(200).json({
                message: "Cuộc trò chuyện đã tồn tại!",
                conversation: existingConversation,
            });
        }

        const conversation = await Conversation.create({
            participants: [senderId, receiverId],
        });

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

        res.status(500).json({
            message: "Lỗi server!",
        });
    }
};
const sendMessage = async (req, res) => {
    try {
        const { content } = req.body;
        const { conversationId } = req.params;

        if (!content || !content.trim()) {
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

        const newMessage = await Message.create({
            conversationId: conversation._id,
            senderId: req.user._id,
            content: content.trim(),
        });

        conversation.lastMessage = newMessage._id;
        await conversation.save();

        await newMessage.populate(
            "senderId",
            "username profilePicture"
        );

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

        res.status(500).json({
            message: error.message,
        });
    }
};
const getMessage = async (req, res) =>{
    try{
        const { conversationId } = req.params;
        const conversation = await Conversation.findById(conversationId);

        if(conversation){
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

        const message = await Message.find({conversationId})
        .populate("senderId", "username profilePicture")
        .sort({ createdAt: -1})

        res.status(200).json({
            message,
        })
    } catch (error) {
    if (error.name === "CastError") {
        return res.status(400).json({
            message: "ID cuộc trò chuyện không hợp lệ!",
        });
    }

    res.status(500).json({
        message: error.message,
    });
}
}
const getConversations = async (req, res) =>{
    try{
        const userId = req.user._id;

        const conversations = await Conversation.find({
            participants: userId, 
        })
        .populate("participants", "username profilePicture")
        .populate({
            path:"lastMessage",
            populate: {
                path:"senderId",
                select: "username profilePicture"
            }
        }).sort({ createdAt: -1});

        res.status(200).json({
            conversations,
        })
    }catch (error) {
            res.status(500).json({ message: error.message });
        }
    };

module.exports = {
    createOrGetConversation,
    sendMessage,
    getMessage,
    getConversations
};