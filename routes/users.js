const router = require('express').Router();
const { 
    updateUser, 
    deleteUser, 
    getUser, 
    followUser, 
    unfollowUser,
    changePassword
} = require('../controllers/userController');

// Cập nhật thông tin user: PUT /api/users/:id
router.put('/:id', updateUser);

// Xóa user: DELETE /api/users/:id
router.delete('/:id', deleteUser);

// Lấy thông tin user: GET /api/users/:id
router.get('/:id', getUser);

// Follow user: PUT /api/users/:id/follow
router.put('/:id/follow', followUser);

// Unfollow user: PUT /api/users/:id/unfollow
router.put('/:id/unfollow', unfollowUser);

router.put('/:id/password', changePassword)
module.exports = router;