const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema(
    {
        authorId:{
            type: mongoose.Schema.Types.ObjectId,
            ref:"User",
            required: true
        },
        postId:{
            type: mongoose.Schema.Types.ObjectId,
            ref:"Post",
            required: true
        },
        content:{
            type: String,
            maxlength:500,
            trim: true,
            required: true
        },
        status: { type: String, enum: ["active", "deleted"], default: "active" },
        // Replies are one level deep: parentId always points to a top-level comment.
        parentId: { type: mongoose.Schema.Types.ObjectId, ref: "Comment", default: null },
        mentions: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
        reactions: [
            {
                _id: false,
                userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
                reaction: { type: String, enum: ["like", "love", "haha", "wow", "sad", "angry"], required: true },
            },
        ],
    },
    {
        timestamps:true,
    }
)
const Comment = mongoose.model("Comment", commentSchema);

module.exports = Comment;