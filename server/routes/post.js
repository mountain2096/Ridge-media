const express = require("express");

const { createPost,
     getPosts,
      getPostById,
       updatePost,
        deletePost,
         likePost,
          unlikePost,
          toggleSavePost,
          sharePost } = require("../controllers/postControllers");
const { reactToPost } = require("../controllers/reactionControllers");

const protect = require("../middlewares/protect");
const router = express.Router();

router.post("/",protect, createPost);
router.get("/", protect, getPosts);
router.get("/:id", protect, getPostById);
router.put("/:id", protect, updatePost);
router.delete("/:id", protect, deletePost);
router.post("/:id/like", protect, likePost);
router.delete("/:id/like", protect, unlikePost);
router.put("/:id/reaction", protect, reactToPost);
router.delete("/:id/reaction", protect, reactToPost);
router.put("/:id/save", protect, toggleSavePost);
router.post("/:id/share", protect, sharePost);
module.exports = router;
