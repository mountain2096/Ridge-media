const Post = require("../models/Post");
const Notification = require("../models/Notification")
const Comment = require("../models/Comment");
const User = require("../models/User");

const createPost = async (req,res) =>{
    try{
        const {content, image, video} = req.body;

        if(typeof content !== "string" || !content.trim()){
            return res.status(400).json({
                message:"Nội dung bài viết không được để trống!"
            })
        }
        if ((image !== undefined && typeof image !== "string") ||
            (video !== undefined && typeof video !== "string")) {
            return res.status(400).json({ message: "Đường dẫn media không hợp lệ!" });
        }

        const post = await Post.create({
            authorId: req.user._id,
            content,
            image: image?.trim() || "",
            video: video?.trim() || "",
        })
        res.status(201).json({
            message:"Đã tạo bài viết mới!"
        })
    } catch(err){
        res.status(500).json({
            message: err.message
        })
    }
}

const getPosts = async (req,res) =>{
    try{
        const page = Number(req.query.page ?? 1);
        const limit = Number(req.query.limit ?? 20);
        if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 50) {
            return res.status(400).json({ message: "Tham số phân trang không hợp lệ!" });
        }

        const blockedByCurrentUser = req.user.blockList || [];
        const usersWhoBlockedCurrentUser = await User.find({ blockList: req.user._id }).select("_id");
        const blockedUserIds = [
            ...blockedByCurrentUser,
            ...usersWhoBlockedCurrentUser.map((user) => user._id),
        ];
        const filter = {
            status: "active",
            authorId: { $nin: blockedUserIds },
            $or: [
                { privacy: "public" },
                { authorId: req.user._id },
                { privacy: "friends", authorId: { $in: req.user.friend || [] } },
            ],
        };
        const [posts, total] = await Promise.all([
            Post.find(filter)
                .populate("authorId", "username profilePicture")
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit),
            Post.countDocuments(filter),
        ]);
        
        const postWithLikeStatus = posts.map((post) =>{
            const postData = post.toObject();

            postData.isLiked = post.likes.some(
                (userId) => userId.toString() === req.user._id.toString()
            );
            postData.isMine =
                post.authorId?._id?.toString() === req.user._id.toString();
            postData.isSaved = req.user.savedPosts.some(
                (postId) => postId.toString() === post._id.toString()
            );
            return postData
        })
        res.status(200).json({
            posts: postWithLikeStatus,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) },
        })
    }catch (error) {
        res.status(500).json({
            message: error.message,
        });
    }
}
const getPostById = async (req, res) =>{
    try{
        const post = await Post.findOne({ _id: req.params.id, status: "active" })
        .populate("authorId","username profilePicture");

        if(!post){
            return res.status(404).json({
                message:"Bài đăng không tồn tại!"
            })
        }
        res.status(200).json({
            post
        })
    } catch(err){
        res.status(err.name === "CastError" ? 400 : 500).json({
            message: err.name === "CastError" ? "ID bài viết không hợp lệ!" : err.message,
        });
    }
}
const updatePost = async (req, res) =>{
    try{
        const { content, image, video } = req.body;

        if ((content !== undefined && typeof content !== "string") ||
            (image !== undefined && typeof image !== "string") ||
            (video !== undefined && typeof video !== "string")) {
            return res.status(400).json({ message: "Dữ liệu bài viết không hợp lệ!" });
        }

        const post = await Post.findOne({ _id: req.params.id, status: "active" });

        if(!post){
            return res.status(404).json({
                message:"Bài viết không tồn tại!"
            })
        }

        if(post.authorId.toString() !== req.user._id.toString()){
            return res.status(403).json({
                message: "Bạn không có quyền chỉnh sửa bài viết này!"
            })
        }

        if(content !== undefined){
            if(!content.trim()){
                return res.status(400).json({
                    message:"Nội dung không được trống!"
                })
            }

            post.content = content;
        }

        if (image !== undefined) {
            post.image = image.trim();
        }
        if (video !== undefined) {
            post.video = video.trim();
        }
        await post.save();

        res.status(200).json({
            message: "Cập nhật bài viết thành công!",
            post,
        });
    } catch(err){
        res.status(err.name === "CastError" ? 400 : 500).json({
            message: err.name === "CastError" ? "ID bài viết không hợp lệ!" : err.message,
        });
    }
}
const deletePost = async (req, res) =>{
    try{
        const post = await Post.findOne({ _id: req.params.id, status: "active" });

        if(!post){
            return res.status(404).json({
                message:"Bài viết không tồn tại!"
            })
        }

        if(post.authorId.toString() !== req.user._id.toString() && !req.user.isAdmin){
            return res.status(403).json({
                message: "Bạn không có quyền xóa bài viết này!",
            });
        }

        post.status = "deleted";
        await post.save();

        res.status(200).json({
            message:"Bài viết đã được xóa!"
        })
    } catch(err){
        res.status(err.name === "CastError" ? 400 : 500).json({
            message: err.name === "CastError" ? "ID bài viết không hợp lệ!" : err.message,
        });
    }
}
const likePost = async (req, res) =>{
    try {
        const post = await Post.findOneAndUpdate(
            {
                _id: req.params.id,
                status: "active",
                likes: { $ne: req.user._id },
            },
            { $addToSet: { likes: req.user._id } },
            { new: true }
        );

        if (!post) {
            const postExists = await Post.exists({ _id: req.params.id, status: "active" });
            if (!postExists) {
                return res.status(404).json({ message: "Bài viết không tồn tại!" });
            }
            return res.status(400).json({ message: "Bạn đã thích bài viết này!" });
        }
        
        if(post.authorId.toString() !== req.user._id.toString()){
            try {
                await Notification.create({
                    recipientId: post.authorId,
                    senderId: req.user._id,
                    type: "like",
                    postId: post._id,
                });
            } catch (notificationError) {
                console.error("Could not create like notification:", notificationError);
            }
        }
        res.status(200).json({
            message:"Đã thích bài viết!",
            likes: post.likes
        })
    }catch (error) {
        res.status(error.name === "CastError" ? 400 : 500).json({
            message: error.name === "CastError" ? "ID bài viết không hợp lệ!" : error.message,
        });
    }
}
const unlikePost = async (req, res) => {
    try {
            const post = await Post.findOneAndUpdate(
            { _id: req.params.id, status: "active" },
            { $pull: { likes: req.user._id } },
            { new: true }
        );

        if (!post) {
            return res.status(404).json({
                message: "Không tìm thấy bài viết!",
            });
        }

        res.status(200).json({
            message: "Đã bỏ thích bài viết!",
            likes: post.likes,
        });
    } catch (error) {
        res.status(error.name === "CastError" ? 400 : 500).json({
            message: error.name === "CastError" ? "ID bài viết không hợp lệ!" : error.message,
        });
    }
};
const toggleSavePost = async (req, res) => {
    try {
        const { isSaved } = req.body;
        if (typeof isSaved !== "boolean") {
            return res.status(400).json({ message: "Thiếu trạng thái lưu bài viết!" });
        }

        const post = await Post.findOne({ _id: req.params.id, status: "active" }).select("_id");
        if (!post) {
            return res.status(404).json({ message: "Không tìm thấy bài viết!" });
        }

        await User.updateOne(
            { _id: req.user._id },
            isSaved
                ? { $addToSet: { savedPosts: post._id } }
                : { $pull: { savedPosts: post._id } }
        );

        res.status(200).json({
            message: isSaved ? "Đã lưu bài viết!" : "Đã bỏ lưu bài viết!",
            isSaved,
        });
    } catch (error) {
        if (error.name === "CastError") {
            return res.status(400).json({ message: "ID bài viết không hợp lệ!" });
        }
        res.status(500).json({ message: error.message });
    }
};
module.exports = {
    createPost,
    getPosts,
    getPostById,
    updatePost,
    deletePost,
    likePost,
    unlikePost,
    toggleSavePost,
}
