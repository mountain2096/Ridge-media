const express = require("express");

const { createPost,
     getPosts,
      getPostById,
       updatePost,
        deletePost,
         likePost,
          unlikePost,
          toggleSavePost,
          sharePost, sendPost } = require("../controllers/postControllers");
const { reactToPost, getPostReactions } = require("../controllers/reactionControllers");

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
router.get("/:id/reactions", protect, getPostReactions);
router.put("/:id/save", protect, toggleSavePost);
router.post("/:id/share", protect, sharePost);
router.post("/:id/send", protect, sendPost);
module.exports = router;
