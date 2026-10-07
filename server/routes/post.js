const express = require("express");

const { createPost,
     getPosts,
      getPostById,
       updatePost,
        deletePost,
         likePost,
          unlikePost } = require("../controllers/postControllers");

const protect = require("../middlewares/protect");
const router = express.Router();

router.post("/",protect, createPost);
router.get("/", protect, getPosts);
router.get("/:id", protect, getPostById);
router.put("/:id", protect, updatePost);
router.delete("/:id", protect, deletePost);
router.post("/:id/like", protect, likePost);
router.delete("/:id/like", protect, unlikePost);
module.exports = router;