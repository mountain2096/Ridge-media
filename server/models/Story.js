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
        expiresAt: {
            type: Date,
            required: true,
            index: { expires: 0 },
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Story", storySchema);
