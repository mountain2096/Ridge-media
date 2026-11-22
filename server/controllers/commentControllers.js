const Comment = require("../models/Comment");
const Post = require("../models/Post")
const Notification = require("../models/Notification");
const User = require("../models/User");
const errorResponse = require("../utils/errorResponse");
const { extractMentionUsernames } = require("../utils/mentions");

const idOf = (value) => String(value?._id || value || "");

const blockedEitherWay = (viewer, other) =>
    (viewer.blockList || []).some((id) => idOf(id) === idOf(other._id)) ||
    (other.blockList || []).some((id) => idOf(id) === idOf(viewer._id));

// Users named with @username who may be told about the comment: real, not
// locked, not the author, no block in either direction, and allowed to see the post.
async function resolveMentionedUsers(content, author, post) {
    const names = extractMentionUsernames(content);
    if (!names.length) return [];
    const users = await User.find({ username: { $in: names } }).select("_id username blockList friend isLocked");
    return users.filter((user) => {
        if (user.isLocked || idOf(user._id) === idOf(author._id) || blockedEitherWay(author, user)) return false;
        if (post.privacy === "public" || idOf(post.authorId) === idOf(user._id)) return true;
        return post.privacy === "friends" && (user.friend || []).some((id) => idOf(id) === idOf(post.authorId));
    });
}

const createComment = async (req, res) =>{
    try{
        const { content, parentId } = req.body;
        const { postId } = req.params
        const post = await Post.findOne({ _id: postId, status: "active" });

        if(typeof content !== "string" || !content.trim()){
            return res.status(400).json({
                message:"Nội dung không được để trống!"
            })
        }

        if(!post){
            return res.status(400).json({
                message:"Bài viết không tồn tại!"
            })
        }

        // Optional reply: the parent must be an active comment of the same post.
        // Replying to a reply attaches to the top-level comment (two levels only).
        let parent = null;
        if (parentId !== undefined && parentId !== null && parentId !== "") {
            if (typeof parentId !== "string" || !/^[a-f\d]{24}$/i.test(parentId)) {
                return res.status(400).json({ message: "Bình luận gốc không hợp lệ!" });
            }
            parent = await Comment.findOne({ _id: parentId, postId, status: "active" });
            if (!parent) {
                return res.status(400).json({ message: "Bình luận gốc không tồn tại!" });
            }
        }

        const mentionedUsers = await resolveMentionedUsers(content, req.user, post);

        const comment = await Comment.create({
            authorId: req.user._id,
            postId,
            content: content.trim(),
            parentId: parent ? (parent.parentId || parent._id) : null,
            mentions: mentionedUsers.map((user) => user._id),
        })

        // One notification per person, strongest reason first: reply, comment, mention.
        const notified = new Set([idOf(req.user._id)]);
        const notify = async (recipientId, type) => {
            if (notified.has(idOf(recipientId))) return;
            notified.add(idOf(recipientId));
            try {
                await Notification.create({
                    recipientId,
                    senderId: req.user._id,
                    type,
                    commentId: comment.id,
                    postId: post.id,
                });
            } catch (notificationError) {
                console.error(`Could not create ${type} notification:`, notificationError);
            }
        };
        if (parent) await notify(parent.authorId, "reply");
        await notify(post.authorId, "comment");
        for (const user of mentionedUsers) await notify(user._id, "mention");

        res.status(200).json({
            message:"Đã đăng bình luận!",
            comment,
        })
    } catch(err){
        if (err.name === "CastError") {
            return res.status(400).json({
                message: "ID bài viết không hợp lệ!",
            });
        }

        return errorResponse(res, err);
    }
    }
const getCommentByPost = async (req, res) =>{
    try{
        const { postId } = req.params
        const post = await Post.findOne({ _id: postId, status: "active" });

        if(!post){
            return res.status(400).json({
                message:"Không tìm thấy bài viết!"
            })
        }

        const comment = await Comment.find({ postId, status: "active" })
        .populate([
            { path: "authorId", select: "username profilePicture" },
            { path: "mentions", select: "username" },
        ])
        .sort({ createdAt : 1})

        const commentsWithOwner = comment.map((item) => {
        const commentData = item.toObject();

        commentData.isMine =
            item.authorId?._id?.toString() === req.user._id.toString();

        return commentData;
        });
        res.status(200).json({
            comment: commentsWithOwner,
        })
    } catch (error) {
        res.status(400).json({
            message: "ID bài viết không hợp lệ!",
        });
    }
}
const updateComment = async (req, res) =>{
    try{
        const { content } = req.body;

        if(typeof content !== "string" || !content.trim()){
            return res.status(400).json({
                message:"Nội dung không hợp lệ!"
            })
        }

        const comment = await Comment.findOne({ _id: req.params.id, status: "active" });

        if(!comment){
            return res.status(400).json({
                message:"Bình luận không tồn tại!"
            })
        }

        if(comment.authorId.toString() !== req.user._id.toString()){
            return res.status(403).json({
                message:"Bạn không có quyền chỉnh sửa bình luận này!"
            })
        }

        comment.content = content.trim();

        await comment.save()
        res.status(200).json({
            message:"Đã chỉnh sửa bình luận!",
            comment,
        })
    }  catch (error) {
        res.status(400).json({
            message: "ID comment không hợp lệ!",
        });
    }
}
const deleteComment = async (req, res) =>{
    try{
        const comment = await Comment.findOne({ _id: req.params.id, status: "active" });

        if (!comment) {
            return res.status(404).json({ message: "Bình luận không tồn tại!" });
        }

        const post = await Post.findById(comment.postId);
        const isCommentOwner = comment.authorId.toString() === req.user._id.toString();
        const isPostOwner = post && post.authorId.toString() === req.user._id.toString();

        if (!isCommentOwner && !isPostOwner && !req.user.isAdmin) {
            return res.status(403).json({ message: "Bạn không có quyền xóa bình luận này!" });
        }

        comment.status = "deleted";
        await comment.save();

        // Deleting a top-level comment also removes its replies. (Strict null:
        // only real top-level comments, which always have parentId = null.)
        let removedReplies = 0;
        if (comment.parentId === null) {
            const result = await Comment.updateMany(
                { parentId: comment._id, status: "active" },
                { $set: { status: "deleted" } }
            );
            removedReplies = Number(result?.modifiedCount) || 0;
        }

        res.status(200).json({ message: "Bình luận đã được xóa!", removed: 1 + removedReplies });
    } catch (error) {
        res.status(400).json({
            message: "ID comment không hợp lệ!",
        });
    }
}
module.exports = {
    createComment,
    getCommentByPost,
    updateComment,
    deleteComment
}
