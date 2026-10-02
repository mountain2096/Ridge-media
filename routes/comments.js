const router = require("express").Router();

const {
  createComment,
  getComments,
  updateComment,
  deleteComment,
} = require("../controllers/commentController");

const protect = require("../middlewares/auth");

// Get comments of a post
router.get("/post/:postId", getComments);

// Create comment
router.post("/post/:postId", protect, createComment);

// Update comment
router.put("/:id", protect, updateComment);

// Delete comment
router.delete("/:id", protect, deleteComment);

module.exports = router;