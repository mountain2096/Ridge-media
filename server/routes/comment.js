const express = require("express");

const {
    createComment, 
    getCommentByPost,
    updateComment,
    deleteComment

} = require("../controllers/commentControllers");

const { reactToComment, getCommentReactions } = require("../controllers/reactionControllers");
const protect = require("../middlewares/protect");

const router = express.Router();


router.post("/:postId", protect, createComment);
router.get("/:postId", protect, getCommentByPost);
router.put("/:id/reaction", protect, reactToComment);
router.delete("/:id/reaction", protect, reactToComment);
router.get("/:id/reactions", protect, getCommentReactions);
router.put("/:id", protect, updateComment)
router.delete("/:id", protect, deleteComment)


module.exports = router;
