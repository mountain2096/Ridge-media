const mongoose = require("mongoose");

const postSchema = new mongoose.Schema(
  {
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    content: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },

    images: {
      type: [String],
      default: [],
    },

    privacy: {
      type: String,
      enum: ["Public", "Friends", "Private"],
      default: "Public",
    },

    status: {
      type: String,
      enum: ["Active", "Deleted"],
      default: "Active",
    },

    originalPostId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

postSchema.index({ authorId: 1, createdAt: -1 });
postSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model("Post", postSchema);