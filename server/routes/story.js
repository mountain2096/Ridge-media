const express = require("express");
const protect = require("../middlewares/protect");
const { createStory, getStories, deleteStory } = require("../controllers/storyControllers");

const router = express.Router();

router.get("/", protect, getStories);
router.post("/", protect, createStory);
router.delete("/:id", protect, deleteStory);

module.exports = router;
