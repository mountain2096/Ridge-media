const express = require("express");
const protect = require("../middlewares/protect");
const { createReport } = require("../controllers/reportControllers");

const router = express.Router();
router.post("/", protect, createReport);

module.exports = router;
