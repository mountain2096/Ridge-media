const errorResponse = require("../utils/errorResponse");
const Post = require("../models/Post");
const Notification = require("../models/Notification")
const Comment = require("../models/Comment");
const User = require("../models/User");
const validateMediaUrl = require("../utils/validateMediaUrl");
const { canAccessPost } = require("../utils/postAccess");
const { findOrCreateConversation, createAndEmitMessage, SHARE_PREVIEW } = require("./messageCotrollers");

const createPost = async (req,res) =>{
    try{
        const {content, image, video, privacy = "public"} = req.body;

        if(typeof content !== "string" || !content.trim()){
            return res.status(400).json({
                message:"Nội dung bài viết không được để trống!"
            })
        }
        if ((image !== undefined && typeof image !== "string") ||
            (video !== undefined && typeof video !== "string")) {
            return res.status(400).json({ message: "Đường dẫn media không hợp lệ!" });
        }
        if (!validateMediaUrl(image, req) || !validateMediaUrl(video, req)) {
            return res.status(400).json({ message: "Media phải là URL hợp lệ từ máy chủ tải lên của chúng tôi." });
        }
        if (!['public', 'friends', 'private'].includes(privacy)) {
            return res.status(400).json({ message: "Quyền riêng tư bài viết không hợp lệ!" });
        }

        const post = await Post.create({
            authorId: req.user._id,
            content,
            image: image?.trim() || "",
            video: video?.trim() || "",
            privacy,
        })
        res.status(201).json({
            message:"Đã tạo bài viết mới!"
        })
    } catch(err){
        return errorResponse(res, err);
    }
}

const getPosts = async (req,res) =>{
    try{
        const page = Number(req.query.page ?? 1);
        const limit = Number(req.query.limit ?? 20);
        if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 50) {
            return res.status(400).json({ message: "Tham số phân trang không hợp lệ!" });
        }
        if (req.query.media !== undefined && req.query.media !== "video") {
            return res.status(400).json({ message: "Tham số phân trang không hợp lệ!" });
        }

        const blockedByCurrentUser = req.user.blockList || [];
        const usersWhoBlockedCurrentUser = await User.find({ blockList: req.user._id }).select("_id");
        const blockedUserIds = [
            ...blockedByCurrentUser,
            ...usersWhoBlockedCurrentUser.map((user) => user._id),
        ];
        const visibleByPrivacy = [
            { privacy: "public" },
            { authorId: req.user._id },
            { privacy: "friends", authorId: { $in: req.user.friend || [] } },
        ];
        const filter = {
            status: "active",
            authorId: { $nin: blockedUserIds },
            $or: visibleByPrivacy,
        };
        if (req.query.media === "video") {
            filter.video = { $nin: ["", null] };
            filter.originalPostId = null;
        }
        if (req.query.authorId !== undefined) {
            if (typeof req.query.authorId !== "string" || !/^[a-f\d]{24}$/i.test(req.query.authorId)) {
                return res.status(400).json({ message: "ID người dùng không hợp lệ!" });
            }
            filter.authorId = { $eq: req.query.authorId, $nin: blockedUserIds };
        }
        const [posts, total] = await Promise.all([
            Post.find(filter)
                .populate("authorId", "username profilePicture")
                .populate({
                    path: "originalPostId",
                    select: "content image video authorId privacy status createdAt editedAt",
                    match: {
                        status: "active",
                        authorId: { $nin: blockedUserIds },
                        $or: [
                            { privacy: "public" },
                            { authorId: req.user._id },
                            { privacy: "friends", authorId: { $in: req.user.friend || [] } },
                        ],
                    },
                    populate: { path: "authorId", select: "username profilePicture" },
                })
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit),
            Post.countDocuments(filter),
        ]);
        const uniquePosts = [...new Map(posts.map((post) => [post._id.toString(), post])).values()];
        const commentCounts = uniquePosts.length ? await Comment.aggregate([
            { $match: { postId: { $in: uniquePosts.map((post) => post._id) }, status: "active" } },
            { $group: { _id: "$postId", count: { $sum: 1 } } },
        ]) : [];
        const commentCountByPost = new Map(commentCounts.map((entry) => [entry._id.toString(), entry.count]));

        const postWithLikeStatus = uniquePosts.map((post) =>{
            const hasOriginalReference = Boolean(post.originalPostId || post.populated?.("originalPostId"));
            const postData = post.toObject();

            postData.isLiked = post.likes.some(
                (userId) => userId.toString() === req.user._id.toString()
            );
            postData.isMine =
                post.authorId?._id?.toString() === req.user._id.toString();
            postData.isSaved = req.user.savedPosts.some(
                (postId) => postId.toString() === post._id.toString()
            );
            postData.commentsCount = commentCountByPost.get(post._id.toString()) || 0;
            postData.originalUnavailable = hasOriginalReference && !postData.originalPostId;
            if (postData.originalUnavailable) {
                postData.content = "";
                postData.image = "";
                postData.video = "";
            }
            return postData
        })
        res.status(200).json({
            posts: postWithLikeStatus,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) },
        })
    }catch (error) {
        return errorResponse(res, error);
    }
}
const getPostById = async (req, res) =>{
    try{
        const post = await Post.findOne({ _id: req.params.id, status: "active" });

        if(!post){
            return res.status(404).json({
                message:"Bài đăng không tồn tại!"
            })
        }
        if (!await canAccessPost(req.user, post)) return res.status(404).json({ message: "Bài viết không tồn tại!" });
        await post.populate("authorId", "username profilePicture");
        if (post.originalPostId) {
            const sourcePost = await Post.findOne({ _id: post.originalPostId, status: "active" });
            if (!sourcePost) return res.status(404).json({ message: "Bài viết không tồn tại!" });
            if (!await canAccessPost(req.user, sourcePost)) {
                return res.status(404).json({ message: "Bài viết không tồn tại!" });
            }
            await post.populate({ path: "originalPostId", select: "content image video authorId privacy status createdAt editedAt", populate: { path: "authorId", select: "username profilePicture" } });
        }
        await post.populate("authorId", "username profilePicture");
        const postData = post.toObject();
        postData.isLiked = post.likes.some((userId) => userId.toString() === req.user._id.toString());
        postData.isMine = post.authorId?._id?.toString() === req.user._id.toString();
        postData.isSaved = (req.user.savedPosts || []).some((postId) => postId.toString() === post._id.toString());
        postData.commentsCount = await Comment.countDocuments({ postId: post._id, status: "active" });
        res.status(200).json({
            post: postData
        })
    } catch(err){
        if (err.name === "CastError") return res.status(400).json({ message: "ID bài viết không hợp lệ!" });
        return errorResponse(res, err);
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
        if (!validateMediaUrl(image, req) || !validateMediaUrl(video, req)) {
            return res.status(400).json({ message: "Media phải là URL hợp lệ từ máy chủ tải lên của chúng tôi." });
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

        let contentChanged = false;
        if(content !== undefined){
            if(!content.trim()){
                return res.status(400).json({
                    message:"Nội dung không được trống!"
                })
            }

            contentChanged = content.trim() !== post.content.trim();
            post.content = content;
        }

        const imageChanged = image !== undefined && image.trim() !== (post.image || "").trim();
        const videoChanged = video !== undefined && video.trim() !== (post.video || "").trim();
        if (image !== undefined) {
            post.image = image.trim();
        }
        if (video !== undefined) {
            post.video = video.trim();
        }
        if (contentChanged || imageChanged || videoChanged) post.editedAt = new Date();
        await post.save();

        res.status(200).json({
            message: "Cập nhật bài viết thành công!",
            post,
        });
    } catch(err){
        if (err.name === "CastError") return res.status(400).json({ message: "ID bài viết không hợp lệ!" });
        return errorResponse(res, err);
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
        await Post.updateMany(
            { originalPostId: post._id, status: "active" },
            { $set: { status: "deleted" } }
        );

        res.status(200).json({
            message:"Bài viết đã được xóa!"
        })
    } catch(err){
        if (err.name === "CastError") return res.status(400).json({ message: "ID bài viết không hợp lệ!" });
        return errorResponse(res, err);
    }
}
const likePost = async (req, res) =>{
    try {
        const target = await Post.findOne({ _id: req.params.id, status: "active" });
        if (!target || !await canAccessPost(req.user, target)) return res.status(404).json({ message: "Bài viết không tồn tại!" });
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
        if (error.name === "CastError") return res.status(400).json({ message: "ID bài viết không hợp lệ!" });
        return errorResponse(res, error);
    }
}
const unlikePost = async (req, res) => {
    try {
            const post = await Post.findOneAndUpdate(
            { _id: req.params.id, status: "active" },
            { $pull: { likes: req.user._id, reactions: { userId: req.user._id } } },
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
        if (error.name === "CastError") return res.status(400).json({ message: "ID bài viết không hợp lệ!" });
        return errorResponse(res, error);
    }
};
const toggleSavePost = async (req, res) => {
    try {
        const { isSaved } = req.body;
        if (typeof isSaved !== "boolean") {
            return res.status(400).json({ message: "Thiếu trạng thái lưu bài viết!" });
        }

        const post = await Post.findOne({ _id: req.params.id, status: "active" }).select("_id authorId privacy");
        if (!post) {
            return res.status(404).json({ message: "Không tìm thấy bài viết!" });
        }
        if (!await canAccessPost(req.user, post)) return res.status(404).json({ message: "Bài viết không tồn tại!" });

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
        return errorResponse(res, error);
    }
};

const sharePost = async (req, res) => {
    try {
        const invalidShare = () => res.status(404).json({ message: "Bài viết gốc không còn khả dụng." });
        const rawCaption = req.body?.caption ?? "";
        if (typeof rawCaption !== "string" || rawCaption.trim().length > 500) {
            return res.status(400).json({ message: "Chú thích không hợp lệ." });
        }
        const caption = rawCaption.trim();
        const requestedPost = await Post.findOne({ _id: req.params.id, status: "active" });
        if (!requestedPost) return invalidShare();
        const originalPost = requestedPost.originalPostId
            ? await Post.findOne({ _id: requestedPost.originalPostId, status: "active", originalPostId: null })
            : requestedPost;
        if (!originalPost) return invalidShare();

        const isOwner = originalPost.authorId.toString() === req.user._id.toString();
        if (originalPost.privacy !== "public" && !isOwner) {
            return invalidShare();
        }
        const author = await User.findById(originalPost.authorId).select("blockList");
        if (!author || (req.user.blockList || []).some((id) => id.toString() === author._id.toString()) ||
            (author.blockList || []).some((id) => id.toString() === req.user._id.toString())) {
            return invalidShare();
        }

        const sharedPost = await Post.create({
            authorId: req.user._id,
            content: caption,
            image: originalPost.image,
            video: originalPost.video,
            privacy: originalPost.privacy,
            originalPostId: originalPost._id,
        });
        if (!isOwner) {
            try {
                await Notification.create({
                    recipientId: originalPost.authorId,
                    senderId: req.user._id,
                    type: "share",
                    postId: sharedPost._id,
                });
            } catch (notificationError) {
                console.error("Could not create share notification:", notificationError);
            }
        }
        return res.status(201).json({ message: "Đã chia sẻ bài viết!", post: sharedPost });
    } catch (error) {
        if (error.name === "CastError") return res.status(400).json({ message: "ID bài viết không hợp lệ!" });
        return errorResponse(res, error);
    }
};

const sendPost = async (req, res) => {
    try {
        const { recipientIds, message } = req.body;
        if (!Array.isArray(recipientIds) || recipientIds.length < 1 || recipientIds.length > 10 ||
            recipientIds.some((id) => !/^[a-f\d]{24}$/i.test(String(id))) ||
            (message !== undefined && (typeof message !== "string" || message.length > 500))) {
            return res.status(400).json({ message: "Danh sách người nhận hoặc nội dung không hợp lệ." });
        }
        const post = await Post.findById(req.params.id);
        if (!post || !await canAccessPost(req.user, post)) return res.status(404).json({ message: "Bài viết không tồn tại!" });
        const sent = [], failed = [];
        for (const recipientId of [...new Set(recipientIds.map(String))]) {
            if (recipientId === String(req.user._id)) { failed.push({ id: recipientId, reason: "Không thể gửi cho chính mình." }); continue; }
            const recipient = await User.findById(recipientId);
            if (!recipient) { failed.push({ id: recipientId, reason: "Không tìm thấy người dùng." }); continue; }
            const blocked = (req.user.blockList || []).some((id) => id.toString() === recipientId) ||
                (recipient.blockList || []).some((id) => id.toString() === String(req.user._id));
            if (blocked) { failed.push({ id: recipientId, reason: "Một trong hai người đã chặn người còn lại." }); continue; }
            if (!(req.user.friend || []).some((id) => id.toString() === recipientId)) { failed.push({ id: recipientId, reason: "Chỉ có thể nhắn tin với bạn bè." }); continue; }
            if (!await canAccessPost(recipient, post)) { failed.push({ id: recipientId, reason: "Người nhận không thể xem bài viết." }); continue; }
            const conversation = await findOrCreateConversation(req.user._id, recipient._id);
            if (message?.trim()) await createAndEmitMessage(conversation, req.user._id, recipient._id, { content: message.trim() });
            await createAndEmitMessage(conversation, req.user._id, recipient._id, { type: "post_share", content: SHARE_PREVIEW, sharedPostId: post._id });
            sent.push(recipientId);
        }
        if (!sent.length) return res.status(403).json({ sent, failed });
        return res.status(201).json({ sent, failed });
    } catch (error) {
        if (error.name === "CastError") return res.status(400).json({ message: "ID không hợp lệ." });
        return errorResponse(res, error);
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
    sharePost,
    sendPost,
}
