const Post = require("../models/Post");
const User = require("../models/User");

// CREATE POST
const createPost = async (req, res, next) => {
  try {
    const { content, images, privacy } = req.body;

    if (!content && (!images || images.length === 0)) {
      return res.status(400).json({
        message: "Post must contain content or at least one image",
      });
    }

    const post = await Post.create({
      authorId: req.user._id,
      content: content || "",
      images: Array.isArray(images) ? images : [],
      privacy: privacy || "Public",
    });

    const populatedPost = await Post.findById(post._id).populate(
      "authorId",
      "username fullName avatarUrl"
    );

    return res.status(201).json({
      message: "Post created successfully",
      post: populatedPost,
    });
  } catch (error) {
    next(error);
  }
};

// UPDATE POST
const updatePost = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post || post.status === "Deleted") {
      return res.status(404).json({
        message: "Post not found",
      });
    }

    if (post.authorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: "You can only update your own post",
      });
    }

    const allowedFields = ["content", "images", "privacy"];
    const updateData = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        message: "No valid fields to update",
      });
    }

    const updatedPost = await Post.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      {
        new: true,
        runValidators: true,
      }
    ).populate("authorId", "username fullName avatarUrl");

    return res.status(200).json({
      message: "Post updated successfully",
      post: updatedPost,
    });
  } catch (error) {
    next(error);
  }
};

// DELETE POST
const deletePost = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post || post.status === "Deleted") {
      return res.status(404).json({
        message: "Post not found",
      });
    }

    const isOwner =
      post.authorId.toString() === req.user._id.toString();

    const isAdmin = req.user.role === "Admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        message: "You can only delete your own post",
      });
    }

    // Soft delete để giữ dữ liệu cho Comment/Like/Report
    post.status = "Deleted";
    await post.save();

    return res.status(200).json({
      message: "Post deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

// GET ONE POST
const getPost = async (req, res, next) => {
  try {
    const post = await Post.findOne({
      _id: req.params.id,
      status: "Active",
    }).populate("authorId", "username fullName avatarUrl");

    if (!post) {
      return res.status(404).json({
        message: "Post not found",
      });
    }

    // Private post
    if (post.privacy === "Private") {
      if (
        !req.user ||
        post.authorId._id.toString() !== req.user._id.toString()
      ) {
        return res.status(403).json({
          message: "This post is private",
        });
      }
    }

    return res.status(200).json(post);
  } catch (error) {
    next(error);
  }
};

// GET TIMELINE
const getTimelinePosts = async (req, res, next) => {
  try {
    const currentUser = await User.findById(req.user._id);

    if (!currentUser) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const followingIds = currentUser.followings || [];

    const authorIds = [
      currentUser._id,
      ...followingIds,
    ];

    const posts = await Post.find({
      authorId: { $in: authorIds },
      status: "Active",
      privacy: { $in: ["Public", "Friends"] },
    })
      .populate("authorId", "username fullName avatarUrl")
      .sort({ createdAt: -1 });

    return res.status(200).json(posts);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createPost,
  updatePost,
  deletePost,
  getPost,
  getTimelinePosts,
};