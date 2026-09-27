const Post = require('../models/Post');
const User = require('../models/User');

// 1. TẠO BÀI VIẾT MỚI
const createPost = async (req, res) => {
    const newPost = new Post(req.body);
    try {
        const savedPost = await newPost.save();
        res.status(200).json({ message: "Đăng bài viết thành công!", savedPost });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// 2. CẬP NHẬT BÀI VIẾT
const updatePost = async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (post.userId === req.body.userId) {
            await post.updateOne({ $set: req.body });
            res.status(200).json({ message: "Cập nhật bài viết thành công!" });
        } else {
            res.status(403).json({ message: "Bạn chỉ có thể cập nhật bài viết của chính mình!" });
        }
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// 3. XÓA BÀI VIẾT
const deletePost = async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (post.userId === req.body.userId) {
            await post.deleteOne();
            res.status(200).json({ message: "Đã xóa bài viết thành công!" });
        } else {
            res.status(403).json({ message: "Bạn chỉ có thể xóa bài viết của chính mình!" });
        }
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// 4. THÍCH / BỎ THÍCH BÀI VIẾT (LIKE & DISLIKE)
const likePost = async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post.likes.includes(req.body.userId)) {
            await post.updateOne({ $push: { likes: req.body.userId } });
            res.status(200).json({ message: "Đã thích bài viết!" });
        } else {
            await post.updateOne({ $pull: { likes: req.body.userId } });
            res.status(200).json({ message: "Đã bỏ thích bài viết!" });
        }
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// 5. LẤY MỘT BÀI VIẾT
const getPost = async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        res.status(200).json(post);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// 6. LẤY BẢNG TIN (TIMELINE POSTS): Bài viết của chính mình + Bài viết của những người mình follow
const getTimelinePosts = async (req, res) => {
    try {
        const currentUser = await User.findById(req.params.userId);
        const userPosts = await Post.find({ userId: currentUser._id });
        const friendPosts = await Promise.all(
            currentUser.followings.map((friendId) => {
                return Post.find({ userId: friendId });
            })
        );
        res.status(200).json(userPosts.concat(...friendPosts));
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

module.exports = { createPost, updatePost, deletePost, likePost, getPost, getTimelinePosts };