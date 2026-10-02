const router = require('express').Router();
const{
    createComment,
    getComment,
    getCommentsByPost
} = require('../controllers/commentController');
router.post('/', createComment);
router.get('/post/:postId', getCommentsByPost)
router.get('/:id', getComment);
module.exports = router;