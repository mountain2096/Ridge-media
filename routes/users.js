const router = require("express").Router();

const {
  updateUser,
  deleteUser,
  getUser,
  followUser,
  unfollowUser,
  changePassword,
} = require("../controllers/userController");

const protect = require("../middlewares/auth");
const requireAdmin = require("../middlewares/admin");

// GET /api/users/:id
router.get("/:id", getUser);

// PUT /api/users/:id
router.put("/:id", protect, updateUser);

// DELETE /api/users/:id
router.delete("/:id", protect, deleteUser);

// PUT /api/users/:id/follow
router.put("/:id/follow", protect, followUser);

// PUT /api/users/:id/unfollow
router.put("/:id/unfollow", protect, unfollowUser);

// PUT /api/users/:id/password
router.put("/:id/password", protect, changePassword);

module.exports = router;