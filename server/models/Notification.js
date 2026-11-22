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
                "message",
                "share",
                "reply",
                "mention",
                "system"
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
        commentId:{
            type: mongoose.Schema.Types.ObjectId,
            ref:"Comment",
            default:null
        },
        reaction:{
            type: String,
            enum: ["like", "love", "haha", "wow", "sad", "angry", null],
            default: null
        },
        isRead:{
            type: Boolean,
            default: false
        }
    },
    {
        timestamps: true
    }
)
// Push every new notification to its recipient in realtime. Message
// notifications are skipped: the messages badge already covers them, and one
// bell entry per chat message would flood the notification list.
notificationSchema.post("save", function (doc) {
    if (doc.type === "message") return;
    void (async () => {
        try {
            const User = require("./User");
            const Post = require("./Post");
            const Comment = require("./Comment");
            const { emitToUser } = require("../utils/realtime");
            const sender = await User.findById(doc.senderId).select("username profilePicture").lean();
            const [post, comment] = await Promise.all([
                doc.postId ? Post.findOne({ _id: doc.postId, status: "active" }).select("content image video originalPostId status").lean() : null,
                doc.commentId ? Comment.findOne({ _id: doc.commentId, status: "active" }).select("content").lean() : null,
            ]);
            emitToUser(doc.recipientId, "notification:new", {
                notification: { ...doc.toObject(), senderId: sender || doc.senderId, postId: post, commentId: comment },
            });
        } catch (error) {
            console.error("Could not push notification:", error.message);
        }
    })();
});

const Notification = mongoose.model("Notification", notificationSchema);

module.exports = Notification;
