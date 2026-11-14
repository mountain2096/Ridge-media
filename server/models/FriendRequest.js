const mongoose = require("mongoose");

const friendRequestSchema = new mongoose.Schema(
    {
        senderId:{
            type: mongoose.Schema.Types.ObjectId,
            ref:"User",
            required: true
        },
        receiverId:{
            type: mongoose.Schema.Types.ObjectId,
            ref:"User",
            required: true
        },
        status:{
            type: String,
            enum: ["pending", "accepted", "rejected"],
            default:"pending"
        },
    },
    {
        timestamps:true
    }
)

friendRequestSchema.index(
    { senderId: 1, receiverId: 1 },
    {
        unique: true,
        partialFilterExpression: { status: "pending" },
        name: "unique_pending_friend_request",
    }
);

const FriendRequest = mongoose.model("FriendRequest", friendRequestSchema);

module.exports = FriendRequest;
