const express = require("express");

const protect = require("../middlewares/protect");
const {sendMessage, createOrGetConversation, getMessage, getConversations, markMessageIsRead, } = require("../controllers/messageCotrollers");

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
router.patch("/conversation/:conversationId/read", protect, markMessageIsRead);
router.get("/conversation/:conversationId/messages", protect, getMessage);
router.get("/conversations", protect, getConversations);
module.exports = router;