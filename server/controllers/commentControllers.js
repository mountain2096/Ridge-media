const Comment = require("../models/Comment");
const Post = require("../models/Post")
const Notification = require("../models/Notification");

const createComment = async (req, res) =>{
    try{
        const { content } = req.body;
        const { postId } = req.params
        const post = await Post.findById(postId);

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

        const comment = await Comment.create({
            authorId: req.user._id,
            postId,
            content: content.trim(),
        })
        if(post.authorId.toString() !== req.user._id.toString()){
            try {
                await Notification.create({
                    recipientId: post.authorId,
                    senderId: req.user._id,
                    type: "comment",
                    commentId: comment.id,
                    postId: post.id,
                });
            } catch (notificationError) {
                console.error("Could not create comment notification:", notificationError);
            }
        }
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

        return res.status(500).json({
            message: err.message,
        });
    }
    }
const getCommentByPost = async (req, res) =>{
    try{
        const { postId } = req.params
        const post = await Post.findById(postId);

        if(!post){
            return res.status(400).json({
                message:"Không tìm thấy bài viết!"
            })
        }

        const comment = await Comment.find({postId})
        .populate("authorId","username profilePicture")
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

        const comment = await Comment.findById(req.params.id);

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
        const comment = await Comment.findById(req.params.id);

        if(!comment){
            return res.status(400).json({
                message:"Bình luận không tồn tại!"
            })
        }

        if(comment.authorId.toString() !== req.user._id.toString()){
            return res.status(403).json({
                message:"Bạn không có quyền xóa bình luận này!"
            })
        }

        await Comment.findByIdAndDelete(req.params.id);

        res.status(200).json({
            message:"Bình luận đã được xóa!"
        })
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
