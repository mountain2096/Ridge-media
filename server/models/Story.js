const mongoose = require("mongoose");

const storySchema = new mongoose.Schema(
    {
        authorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        mediaUrl: {
            type: String,
            required: true,
            trim: true,
        },
        mediaType: {
            type: String,
            enum: ["image", "video"],
            required: true,
        },
        caption: { type: String, trim: true, maxlength: 500, default: "" },
        reactions: [{
            _id: false,
            user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
            type: { type: String, enum: ["like", "love", "haha", "wow", "sad", "angry"], required: true },
            createdAt: { type: Date, default: Date.now },
        }],
        expiresAt: {
            type: Date,
            required: true,
            index: { expires: 0 },
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Story", storySchema);
