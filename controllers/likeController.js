const Like = require("../models/Like");
const Post = require("../models/Post");

// LIKE POST
const likePost = async (req, res, next) => {
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

    const existingLike = await Like.findOne({
      postId: post._id,
      userId: req.user._id,
    });

    if (existingLike) {
      return res.status(409).json({
        message: "You already liked this post",
      });
    }

    const like = await Like.create({
      postId: post._id,
      userId: req.user._id,
    });

    return res.status(201).json({
      message: "Post liked successfully",
      like,
    });
  } catch (error) {
    next(error);
  }
};

// UNLIKE POST
const unlikePost = async (req, res, next) => {
  try {
    const like = await Like.findOne({
      postId: req.params.postId,
      userId: req.user._id,
    });

    if (!like) {
      return res.status(404).json({
        message: "Like not found",
      });
    }

    await Like.findByIdAndDelete(like._id);

    return res.status(200).json({
      message: "Post unliked successfully",
    });
  } catch (error) {
    next(error);
  }
};

// GET LIKE COUNT
const getLikeCount = async (req, res, next) => {
  try {
    const count = await Like.countDocuments({
      postId: req.params.postId,
    });

    return res.status(200).json({
      postId: req.params.postId,
      count,
    });
  } catch (error) {
    next(error);
  }
};

// CHECK IF CURRENT USER LIKED
const checkLike = async (req, res, next) => {
  try {
    const like = await Like.findOne({
      postId: req.params.postId,
      userId: req.user._id,
    });

    return res.status(200).json({
      liked: !!like,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  likePost,
  unlikePost,
  getLikeCount,
  checkLike,
};