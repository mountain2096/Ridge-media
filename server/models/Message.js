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