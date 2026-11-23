const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
    {
        conversationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Conversation",
            required: true,
        },

        senderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        content: {
            type: String,
            trim: true,
            maxlength: 2000,
            required: true,
        },

        // "sticker" messages keep a readable label in `content` and the sticker id here.
        type: {
            type: String,
            enum: ["text", "sticker", "post_share", "image", "video"],
            default: "text",
        },

        stickerId: {
            type: String,
            maxlength: 64,
            default: null,
        },

        mediaUrl: { type: String, maxlength: 500, default: null },

        sharedPostId: { type: mongoose.Schema.Types.ObjectId, ref: "Post", default: null },

        isRead: {
            type: Boolean,
            default: false,
        },

        readAt: {
            type: Date,
            default: null,
        },

        reactions: [
            {
                _id: false,
                userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
                reaction: { type: String, enum: ["like", "love", "haha", "wow", "sad", "angry"], required: true },
            },
        ],
    },
    {
        timestamps: true,
    }
);

const Message = mongoose.model("Message", messageSchema);

module.exports = Message;
