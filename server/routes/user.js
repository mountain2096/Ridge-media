const express = require("express");

const { getMe } = require("../controllers/userControllers");

const protect = require("../middlewares/protect");
const router = express.Router();

router.get("/me",protect, getMe);
module.exports = router;