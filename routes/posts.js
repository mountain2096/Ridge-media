const router = require("express").Router();

const {
  createPost,
  updatePost,
  deletePost,
  getPost,
  getTimelinePosts,
} = require("../controllers/postController");

const protect = require("../middlewares/auth");

// Timeline
router.get("/timeline", protect, getTimelinePosts);

// Create
router.post("/", protect, createPost);

// Get one
router.get("/:id", protect, getPost);

// Update
router.put("/:id", protect, updatePost);

// Delete
router.delete("/:id", protect, deletePost);

module.exports = router;