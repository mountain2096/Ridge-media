const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
    {
        recipientId:{
            type: mongoose.Schema.Types.ObjectId,
            ref:"User",
            required: true
        },
        senderId:{
            type:mongoose.Schema.Types.ObjectId,
            ref:"User",
            required: true,
        },
        type:{
            type: String,
            enum:[
                "friend_request",
                "friend_accept",
                "friend_reject",
                "like",
                "comment",
                "message"
            ],
            required: true
        },
        friendRequestId:{
            type:mongoose.Schema.Types.ObjectId,
            ref:"FriendRequest",
            default:null
        },
        postId:{
            type:mongoose.Schema.Types.ObjectId,
            ref:"Post",
            default: null,
        },
        commnentId:{
            type: mongoose.Schema.Types.ObjectId,
            ref:"Comment",
            default:null
        },
        isRead:{
            type: Boolean,
            default: false
        }
    },
    {
        timestamp: true
    }
)
const Notification = mongoose.model("Notification", notificationSchema);

module.exports = Notification;