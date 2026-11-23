const express = require("express");

const protect = require("../middlewares/protect");
const {sendMessage, createOrGetConversation, getMessage, getConversations, markMessageIsRead, updateNickname, setConversationMute, setConversationQuickIcon } = require("../controllers/messageCotrollers");

const { reactToMessage } = require("../controllers/reactionControllers");

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
router.patch("/conversation/:conversationId/nickname", protect, updateNickname);
router.put("/conversation/:conversationId/mute", protect, setConversationMute);
router.patch("/conversation/:conversationId/quick-icon", protect, setConversationQuickIcon);
router.get("/conversation/:conversationId/messages", protect, getMessage);
router.put("/conversation/:conversationId/messages/:messageId/reaction", protect, reactToMessage);
router.delete("/conversation/:conversationId/messages/:messageId/reaction", protect, reactToMessage);
router.get("/conversations", protect, getConversations);
module.exports = router;
