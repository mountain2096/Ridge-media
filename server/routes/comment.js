const express = require("express");

const {
    createComment, 
    getCommentByPost,
    updateComment,
    deleteComment

} = require("../controllers/commentControllers");

const protect = require("../middlewares/protect");

const router = express.Router();


router.post("/:postId", protect, createComment);
router.get("/:postId", protect, getCommentByPost);
router.put("/:id", protect, updateComment)
router.delete("/:id", protect, deleteComment)


module.exports = router;
