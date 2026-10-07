const mongoose = require("mongoose");

const postSchema = new mongoose.Schema(
    {
        authorId:{
            type: mongoose.Schema.Types.ObjectId,
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
        likes:[
            {
                type: mongoose.Schema.Types.ObjectId,
                ref:"User"
            }
        ]
    },
    {
        timestamps: true
    }
)

const Post = mongoose.model("Post", postSchema);

module.exports = Post;