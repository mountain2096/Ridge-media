const Comment = require("../models/Comment");
const Post = require("../models/Post");

// CREATE COMMENT
const createComment = async (req, res, next) => {
  try {
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({
        message: "Comment content is required",
      });
    }

    const post = await Post.findOne({
      _id: req.params.postId,
      status: "Active",
    });

    if (!post) {
      return res.status(404).json({
        message: "Post not found",
      });
    }

    const comment = await Comment.create({
      postId: post._id,
      userId: req.user._id,
      content: content.trim(),
    });

    const populatedComment = await Comment.findById(comment._id).populate(
      "userId",
      "username fullName avatarUrl"
    );

    return res.status(201).json({
      message: "Comment created successfully",
      comment: populatedComment,
    });
  } catch (error) {
    next(error);
  }
};

// GET COMMENTS
const getComments = async (req, res, next) => {
  try {
    const post = await Post.findOne({
      _id: req.params.postId,
      status: "Active",
    });

    if (!post) {
      return res.status(404).json({
        message: "Post not found",
      });
    }

    const comments = await Comment.find({
      postId: req.params.postId,
    })
      .populate("userId", "username fullName avatarUrl")
      .sort({ createdAt: 1 });

    return res.status(200).json(comments);
  } catch (error) {
    next(error);
  }
};

// UPDATE COMMENT
const updateComment = async (req, res, next) => {
  try {
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({
        message: "Comment content is required",
      });
    }

    const comment = await Comment.findById(req.params.id);

    if (!comment) {
      return res.status(404).json({
        message: "Comment not found",
      });
    }

    if (comment.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: "You can only edit your own comment",
      });
    }

    comment.content = content.trim();
    await comment.save();

    const updatedComment = await Comment.findById(comment._id).populate(
      "userId",
      "username fullName avatarUrl"
    );

    return res.status(200).json({
      message: "Comment updated successfully",
      comment: updatedComment,
    });
  } catch (error) {
    next(error);
  }
};

// DELETE COMMENT
const deleteComment = async (req, res, next) => {
  try {
    const comment = await Comment.findById(req.params.id);

    if (!comment) {
      return res.status(404).json({
        message: "Comment not found",
      });
    }

    const isOwner =
      comment.userId.toString() === req.user._id.toString();

    const post = await Post.findById(comment.postId);

    const isPostOwner =
      post &&
      post.authorId.toString() === req.user._id.toString();

    const isAdmin = req.user.role === "Admin";

    if (!isOwner && !isPostOwner && !isAdmin) {
      return res.status(403).json({
        message: "You are not allowed to delete this comment",
      });
    }

    await Comment.findByIdAndDelete(req.params.id);

    return res.status(200).json({
      message: "Comment deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createComment,
  getComments,
  updateComment,
  deleteComment,
};