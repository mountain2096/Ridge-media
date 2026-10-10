const express = require("express");

const protect = require("../middlewares/protect");
const {sendMessage, createOrGetConversation, getMessage, getConversations } = require("../controllers/messageCotrollers");

const router = express.Router();

router.post(
    "/conversation/:userId",
    protect,
    createOrGetConversation
);
router.post(
    "/conversation/:conversationId/messages",
    protect,
    sendMessage
);
router.get("/conversation/:conversationId/messages", protect, getMessage);
router.get("/conversations", protect, getConversations);

module.exports = router;