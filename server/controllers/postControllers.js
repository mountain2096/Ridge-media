const Post = require("../models/Post");
const Notification = require("../models/Notification")

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

const getPosts = async (req,res) =>{
    try{
        const posts = await Post.find()
        .populate("authorId", "username profilePicture")
        .sort({createdAt: -1});
        
        res.status(200).json({
            posts
        })
    }catch (error) {
        res.status(500).json({
            message: error.message,
        });
    }
}
const getPostById = async (req, res) =>{
    try{
        const post = await Post.findById(req.params.id)
        .populate("authorId","username profilePicture");

        if(!post){
            return res.status(400).json({
                message:"Bài đăng không tồn tại!"
            })
        }
        res.status(200).json({
            post
        })
    } catch(err){
        res.status(400).json({
            message:"ID bài viết không hợp lệ!"
        })
    }
}
const updatePost = async (req, res) =>{
    try{
        const { content, image } = req.body;

        const post =  await Post.findById(req.params.id);

        if(!post){
            return res.status(400).json({
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
            post.image = image;
        }
        await post.save();

        res.status(200).json({
            message: "Cập nhật bài viết thành công!",
            post,
        });
    } catch(err){
        res.status(400).json({
            message: "ID bài viết không hợp lệ!",
        });
    }
}
const deletePost = async (req, res) =>{
    try{
        const post = await Post.findById(req.params.id);

        if(!post){
            return res.status(400).json({
                message:"Bài viết không tồn tại!"
            })
        }

        if(post.authorId.toString() !== req.user._id.toString()){
            return res.status(403).json({
                message: "Bạn không có quyền xóa bài viết này!",
            });
        }

        await Post.findByIdAndDelete(req.params.id);

        res.status(200).json({
            message:"Bài viết đã được xóa!"
        })
    } catch(err){
        res.status(400).json({
            message: "ID bài viết không hợp lệ!",
        });
    }
}
const likePost = async (req, res) =>{
    try {
        const post = await Post.findById(req.params.id);

        if(!post){
            return res.status(400).json({
                message:"Bài viết không tồn tại!"
            })
        }

        const userId = req.user._id.toString();

        const alreadyLiked = post.likes.some((id) => id.toString() === userId);

        if(alreadyLiked){
            return res.status(400).json()({
                message:"Bạn đã thích bài viết này!", 
            })
        }
        post.likes.push(req.user._id);

        await post.save()
        
        if(post.authorId.toString() !== req.user._id.toString()){
            await Notification.create({
                recipientId: post.xauthorId,
                senderId: req.user._id,
                type:"like",
                postId:post._id
            })
        }
        res.status(200).json({
            message:"Đã thích bài viết!",
            likes: post.likes
        })
    }catch (error) {
        res.status(400).json({
            message: "ID bài viết không hợp lệ!",
        });
    }
}
const unlikePost = async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);

        if (!post) {
            return res.status(404).json({
                message: "Không tìm thấy bài viết!",
            });
        }

        const userId = req.user._id.toString();

        post.likes = post.likes.filter(
            (id) => id.toString() !== userId
        );

        await post.save();

        res.status(200).json({
            message: "Đã bỏ thích bài viết!",
            likes: post.likes,
        });
    } catch (error) {
        res.status(400).json({
            message: "ID bài viết không hợp lệ!",
        });
    }
};
module.exports = {
    createPost,
    getPosts,
    getPostById,
    updatePost,
    deletePost,
    likePost,
    unlikePost
}