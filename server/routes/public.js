const express = require("express");
const { getPublicUser, getPublicUserPosts } = require("../controllers/publicControllers");
const { publicRead } = require("../middleware/rateLimiters");

const router = express.Router();
router.get("/users/:id", publicRead, getPublicUser);
router.get("/users/:id/posts", publicRead, getPublicUserPosts);

module.exports = router;
