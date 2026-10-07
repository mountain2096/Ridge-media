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
            ref:"User",
            required: true
        },
        content:{
            type: String,
            maxlength:500,
            trim: true,
            required: true
        }
    },
    {
        timestamps:true,
    }
)
const Comment = mongoose.model("Comment", commentSchema);

module.exports = Comment;