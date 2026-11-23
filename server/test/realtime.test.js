const test = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");

const Conversation = require("../models/Conversation");
const User = require("../models/User");
const Message = require("../models/Message");
const Notification = require("../models/Notification");
const { sendMessage, markMessageIsRead } = require("../controllers/messageCotrollers");
const { setIO, emitToUser } = require("../utils/realtime");
const { authenticateSocket, registerSocketHandlers } = require("../socket");

const SENDER_ID = "64b000000000000000000001";
const RECEIVER_ID = "64b000000000000000000002";
const CONVERSATION_ID = "64b0000000000000000000c1";

function response() {
    return {
        statusCode: 200,
        body: null,
        status(code) { this.statusCode = code; return this; },
        json(body) { this.body = body; return this; },
    };
}

function fakeIO() {
    const emitted = [];
    return {
        emitted,
        to(room) {
            return { emit(event, payload) { emitted.push({ room, event, payload }); } };
        },
    };
}

const wait = (ms = 25) => new Promise((resolve) => setTimeout(resolve, ms));

test("emitToUser is a no-op without a socket server and targets the user room with one", () => {
    setIO(null);
    assert.equal(emitToUser(RECEIVER_ID, "ping", {}), false);

    const io = fakeIO();
    setIO(io);
    try {
        assert.equal(emitToUser({ _id: RECEIVER_ID }, "ping", { ok: true }), true);
        assert.deepEqual(io.emitted, [{ room: `user:${RECEIVER_ID}`, event: "ping", payload: { ok: true } }]);
    } finally {
        setIO(null);
    }
});

test("socket handshake rejects missing, invalid and locked-account tokens", async () => {
    process.env.JWT_SECRET = "test-secret";
    const originalFindById = User.findById;
    let lockedUser = false;
    User.findById = () => ({ select: async () => ({ _id: SENDER_ID, isLocked: lockedUser }) });

    try {
        const run = async (token) => {
            const socket = { handshake: { auth: { token } }, data: {} };
            let error = null;
            await authenticateSocket(socket, (value) => { error = value || null; });
            return { socket, error };
        };

        assert.equal((await run(undefined)).error?.message, "UNAUTHORIZED");
        assert.equal((await run("not-a-jwt")).error?.message, "UNAUTHORIZED");

        const token = jwt.sign({ id: SENDER_ID }, process.env.JWT_SECRET);
        const accepted = await run(token);
        assert.equal(accepted.error, null);
        assert.equal(accepted.socket.data.userId, SENDER_ID);

        lockedUser = true;
        assert.equal((await run(token)).error?.message, "UNAUTHORIZED");
    } finally {
        User.findById = originalFindById;
    }
});

test("typing events reach only the other participant and respect blocks", async () => {
    const originalConversationFind = Conversation.findById;
    const originalUserFind = User.findById;
    const io = fakeIO();
    setIO(io);

    let receiverBlocksSender = false;
    Conversation.findById = () => ({
        select: async () => ({ participants: [SENDER_ID, RECEIVER_ID], hiddenFor: [] }),
    });
    User.findById = (id) => ({
        select: async () => ({
            _id: id,
            blockList: id === RECEIVER_ID && receiverBlocksSender ? [SENDER_ID] : [],
        }),
    });

    try {
        const handlers = {};
        const joined = [];
        const socket = { data: { userId: SENDER_ID }, join: (room) => joined.push(room), on: (name, fn) => { handlers[name] = fn; } };
        registerSocketHandlers(socket);
        assert.deepEqual(joined, [`user:${SENDER_ID}`]);

        handlers["typing:start"]({ conversationId: CONVERSATION_ID });
        await wait();
        assert.deepEqual(io.emitted, [{
            room: `user:${RECEIVER_ID}`,
            event: "typing",
            payload: { conversationId: CONVERSATION_ID, userId: SENDER_ID, isTyping: true },
        }]);

        // Invalid ids are ignored without emitting or throwing.
        handlers["typing:stop"]({ conversationId: "nope" });
        await wait();
        assert.equal(io.emitted.length, 1);

        // A block in either direction silences typing indicators.
        receiverBlocksSender = true;
        handlers["typing:stop"]({ conversationId: CONVERSATION_ID });
        await wait();
        assert.equal(io.emitted.length, 1);
    } finally {
        setIO(null);
        Conversation.findById = originalConversationFind;
        User.findById = originalUserFind;
    }
});

test("sendMessage pushes message:new to the receiver and the sender's other tabs", async () => {
    const originalConversationFind = Conversation.findById;
    const originalUserFind = User.findById;
    const originalMessageCreate = Message.create;
    const originalNotificationCreate = Notification.create;
    const io = fakeIO();
    setIO(io);
    let notificationCalls = 0;

    const savedMessage = {
        _id: "m1",
        content: "xin chào",
        populate: async () => {},
        toObject() { return { _id: "m1", content: "xin chào", conversationId: CONVERSATION_ID }; },
    };
    Conversation.findById = async () => ({
        _id: CONVERSATION_ID,
        participants: [SENDER_ID, RECEIVER_ID],
        hiddenFor: [],
        save: async () => {},
    });
    User.findById = () => ({ select: async () => ({ _id: RECEIVER_ID, blockList: [] }) });
    Message.create = async () => savedMessage;
    Notification.create = async () => { notificationCalls += 1; return {}; };

    try {
        const res = response();
        await sendMessage({
            params: { conversationId: CONVERSATION_ID },
            body: { content: "xin chào" },
            user: { _id: SENDER_ID, blockList: [] },
        }, res);

        assert.equal(res.statusCode, 201);
        assert.deepEqual(io.emitted.map((item) => [item.room, item.event]), [
            [`user:${RECEIVER_ID}`, "message:new"],
            [`user:${SENDER_ID}`, "message:new"],
        ]);
        assert.equal(io.emitted[0].payload.conversationId, CONVERSATION_ID);
        assert.equal(io.emitted[0].payload.message._id, "m1");
        assert.equal(notificationCalls, 0);
    } finally {
        setIO(null);
        Conversation.findById = originalConversationFind;
        User.findById = originalUserFind;
        Message.create = originalMessageCreate;
        Notification.create = originalNotificationCreate;
    }
});

test("markMessageIsRead tells the other participant when messages were seen", async () => {
    const originalConversationFind = Conversation.findById;
    const originalUserFind = User.findById;
    const originalUpdateMany = Message.updateMany;
    const io = fakeIO();
    setIO(io);

    let modifiedCount = 2;
    let updateArgs = null;
    Conversation.findById = async () => ({
        _id: CONVERSATION_ID,
        participants: [SENDER_ID, RECEIVER_ID],
        hiddenFor: [],
    });
    User.findById = () => ({ select: async () => ({ _id: SENDER_ID, blockList: [] }) });
    Message.updateMany = async (...args) => { updateArgs = args; return { modifiedCount }; };

    try {
        const res = response();
        await markMessageIsRead({
            params: { conversationId: CONVERSATION_ID },
            user: { _id: RECEIVER_ID, blockList: [] },
        }, res);

        assert.equal(res.statusCode, 200);
        assert.equal(updateArgs[1].$set.isRead, true);
        assert.ok(updateArgs[1].$set.readAt instanceof Date);
        assert.equal(io.emitted.length, 1);
        assert.equal(io.emitted[0].room, `user:${SENDER_ID}`);
        assert.equal(io.emitted[0].event, "message:read");
        assert.equal(io.emitted[0].payload.readerId, RECEIVER_ID);

        // Nothing newly read means nothing to announce.
        io.emitted.length = 0;
        modifiedCount = 0;
        await markMessageIsRead({
            params: { conversationId: CONVERSATION_ID },
            user: { _id: RECEIVER_ID, blockList: [] },
        }, response());
        assert.equal(io.emitted.length, 0);
    } finally {
        setIO(null);
        Conversation.findById = originalConversationFind;
        User.findById = originalUserFind;
        Message.updateMany = originalUpdateMany;
    }
});
