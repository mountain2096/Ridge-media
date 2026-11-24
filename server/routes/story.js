const express = require("express");
const protect = require("../middlewares/protect");
const { createStory, getStories, deleteStory, reactToStory, replyToStory, getStoryReactions } = require("../controllers/storyControllers");

const router = express.Router();

router.get("/", protect, getStories);
router.post("/", protect, createStory);
router.put("/:id/reaction", protect, reactToStory);
router.delete("/:id/reaction", protect, reactToStory);
router.post("/:id/reply", protect, replyToStory);
router.get("/:id/reactions", protect, getStoryReactions);
router.delete("/:id", protect, deleteStory);

module.exports = router;
