    const router = require('express').Router();
const {
    createPost,
    updatePost,
    deletePost,
    likePost,
    getPost,
    getTimelinePosts
} = require('../controllers/postController');

// Tạo bài viết: POST /api/posts
router.post('/', createPost);

// Cập nhật bài viết: PUT /api/posts/:id
router.put('/:id', updatePost);

// Xóa bài viết: DELETE /api/posts/:id
router.delete('/:id', deletePost);

// Thích/Bỏ thích bài viết: PUT /api/posts/:id/like
router.put('/:id/like', likePost);

// Lấy thông tin 1 bài viết: GET /api/posts/:id
router.get('/:id', getPost);

// Lấy bảng tin timeline: GET /api/posts/timeline/:userId
router.get('/timeline/:userId', getTimelinePosts);

module.exports = router;