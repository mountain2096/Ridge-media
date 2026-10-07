const express = require("express");

const { createPost } = require("../controllers/postControllers");

const protect = require("../middlewares/protect");
const router = express.Router();

router.post("/",protect, createPost)
module.exports = router;