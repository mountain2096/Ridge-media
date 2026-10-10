const Comment = require("../models/Comment");
const Post = require("../models/Post")
const Notification = require("../models/Notification");

const createComment = async (req, res) =>{
    try{
        const { content } = req.body;
        const { postId } = req.params
        const post = await Post.findById({ postId });

        if(!content){
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
            content
        })
        await Notification.create({
            recipientId: authorId,
            senderId: req.user._id,
            typeL:"comment",
            commentId: comment.id,
            postId:post.id
        })
        res.status(200).json({
            message:"Đã đăng bình luận!",
            comment,
        })
    } catch(err){
        res.status(400).json({
            message: "Dữ liệu không hợp lệ!",
        });s
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

        res.status(200).json({
            comment,
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

        if(!content || !content.trim()){
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
            return res.status(400).json({
                message:"Bạn không có quyền chỉnh sửa bình luận này!"
            })
        }

        comment.content = content;

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
            return res.status(400).json({
                message:"Bạn không có quyền chỉnh sửa bình luận này!"
            })
        }

        await Comment.findByIdAndDelete(req.params.id);
        await Comment.find

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