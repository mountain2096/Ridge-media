const Comment = require("../models/Comment");
const Post = require("../models/Post");
const User = require("../models/User");

const createComment = async(req,res) =>{
    const newComment = new Comment(req.body);
    if(newComment.)
    try{
        const savedComment = await newComment.save();
        res.status(200).json({message:"Đã đăng bình luận!", savedComment})
    } catch(err){
        return res.status(500).json({message:"Lỗi server "+err.message})
    }
}

    const getComment = async(req, res) =>{
        try{
            const comment = await Comment.findById(req.params.id);
            if(!comment){
            return res.status(404).json({message: "Bình luận không tồn tại!"});
            }
            res.status(200).json(comment);
        } catch(err){
            res.status(500).json({message: err.message});
        }
    }
    const getCommentsByPost = async(req, res) => {
    try {

        const allComment = await Comment.find({
            postId: req.params.postId
        });

        if(allComment.length === 0) {
            return res.status(404).json({
                message: "Không tồn tại bình luận trong bài đăng này!"
            });
        }

        res.status(200).json({ allComment });

    } catch(err) {

        res.status(500).json({
            message: err.message
        });

    }
    }

module.exports = {createComment, getComment, getCommentsByPost};