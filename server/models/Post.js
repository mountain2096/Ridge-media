const mongoose = require("mongoose");

const postSchema = new mongoose.Schema(
    {
        authorId:{
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        content:{
            type: String,
            trim: true,
            maxlength: 500,
            required: true
        },
        image:{
            type: String,
            default: ""
        },
        video:{
            type: String,
            default: ""
        },
        privacy: { type: String, enum: ["public", "friends", "private"], default: "public" },
        status: { type: String, enum: ["active", "hidden", "deleted"], default: "active", index: true },
        originalPostId: { type: mongoose.Schema.Types.ObjectId, ref: "Post", default: null },
        likes:[
            {
                type: mongoose.Schema.Types.ObjectId,
                ref:"User"
            }
        ],
        reactions: [
            {
                _id: false,
                userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
                reaction: { type: String, enum: ["like", "love", "haha", "wow", "sad", "angry"], required: true },
            },
        ],
    },
    {
        timestamps: true
    }
)

const Post = mongoose.model("Post", postSchema);

module.exports = Post;
