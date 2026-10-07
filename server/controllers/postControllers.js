const Post = require("../models/Post");

const createPost = async (req,res) =>{
    try{
        const {content, image} = req.body;

        if(!content){
            return res.status(400).json({
                message:"Nội dung bài viết không được để trống!"
            })
        }

        const post = await Post.create({
            authorId: req.user._id,
            content,
            image: image || ""
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
module.exports = {
    createPost,
}