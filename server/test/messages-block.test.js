const test = require("node:test");
const assert = require("node:assert/strict");
const Conversation = require("../models/Conversation");
const User = require("../models/User");
const Message = require("../models/Message");
const { createOrGetConversation, sendMessage } = require("../controllers/messageCotrollers");

function response() {
    return {
        statusCode: 200,
        body: null,
        status(code) { this.statusCode = code; return this; },
        json(body) { this.body = body; return this; },
    };
}

test("conversation creation is rejected when the recipient blocked the sender", async () => {
    const originalFindById = User.findById;
    const originalCreate = Conversation.create;
    User.findById = async () => ({ _id: "receiver", blockList: ["sender"] });
    Conversation.create = async () => { throw new Error("must not create conversation"); };

    try {
        const res = response();
        await createOrGetConversation({
            params: { userId: "receiver" },
            user: { _id: "sender", friend: ["receiver"], blockList: [] },
        }, res);
        assert.equal(res.statusCode, 403);
    } finally {
        User.findById = originalFindById;
        Conversation.create = originalCreate;
    }
});

test("sending is rejected when the current user blocked the other participant", async () => {
    const originalConversationFind = Conversation.findById;
    const originalUserFind = User.findById;
    const originalMessageCreate = Message.create;
    Conversation.findById = async () => ({
        _id: "conversation",
        participants: ["sender", "receiver"],
        hiddenFor: [],
    });
    User.findById = () => ({ select: async () => ({ _id: "receiver", blockList: [] }) });
    Message.create = async () => { throw new Error("must not create message"); };

    try {
        const res = response();
        await sendMessage({
            params: { conversationId: "conversation" },
            body: { content: "hello" },
            user: { _id: "sender", blockList: ["receiver"] },
        }, res);
        assert.equal(res.statusCode, 403);
    } finally {
        Conversation.findById = originalConversationFind;
        User.findById = originalUserFind;
        Message.create = originalMessageCreate;
    }
});
