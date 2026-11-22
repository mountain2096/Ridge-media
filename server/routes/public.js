const express = require("express");
const { getPublicUser, getPublicFeed, getPublicUserPosts } = require("../controllers/publicControllers");
const { publicRead } = require("../middleware/rateLimiters");

const router = express.Router();
router.get("/users/:id", publicRead, getPublicUser);
router.get("/users/:id/posts", publicRead, getPublicUserPosts);
router.get("/posts", publicRead, getPublicFeed);

module.exports = router;
