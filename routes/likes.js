const router = require("express").Router();

const {
  likePost,
  unlikePost,
  getLikeCount,
  checkLike,
} = require("../controllers/likeController");

const protect = require("../middlewares/auth");

// Like
router.post("/post/:postId", protect, likePost);

// Unlike
router.delete("/post/:postId", protect, unlikePost);

// Like count
router.get("/post/:postId/count", getLikeCount);

// Check current user's like
router.get("/post/:postId/check", protect, checkLike);

module.exports = router;