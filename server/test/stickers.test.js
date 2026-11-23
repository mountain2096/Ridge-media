const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const Conversation = require("../models/Conversation");
const User = require("../models/User");
const Message = require("../models/Message");
const Notification = require("../models/Notification");
const { sendMessage } = require("../controllers/messageCotrollers");
const { setIO } = require("../utils/realtime");
const { STICKER_PACKS, STICKER_IDS, STICKER_PREVIEW, isStickerId } = require("../utils/stickers");

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

test("sticker ids are unique, well formed and checked strictly", () => {
    assert.equal(new Set(STICKER_IDS).size, STICKER_IDS.length);
    assert.ok(STICKER_IDS.length >= 16);
    for (const id of STICKER_IDS) assert.match(id, /^[a-z]+-[a-z]+$/);

    assert.equal(isStickerId("faces-smile"), true);
    assert.equal(isStickerId("faces-nope"), false);
    assert.equal(isStickerId("../etc/passwd"), false);
    assert.equal(isStickerId(""), false);
    assert.equal(isStickerId(null), false);
    assert.equal(isStickerId({ $ne: "" }), false);
    assert.equal(isStickerId(["faces-smile"]), false);
});

test("the client sticker catalog lists exactly the server's stickers", () => {
    const source = fs.readFileSync(path.join(__dirname, "..", "..", "client", "src", "lib", "stickers.js"), "utf8");
    for (const pack of STICKER_PACKS) {
        assert.ok(source.includes(`id: "${pack.id}"`), `client is missing pack ${pack.id}`);
        for (const name of pack.stickers) {
            assert.ok(source.includes(`name: "${name}"`), `client is missing sticker ${pack.id}-${name}`);
        }
    }
    const clientStickerCount = (source.match(/\bname: "/g) || []).length;
    assert.equal(clientStickerCount, STICKER_IDS.length, "client has stickers the server does not know");
});

function stubSendMessage() {
    const originals = {
        conversationFind: Conversation.findById,
        userFind: User.findById,
        messageCreate: Message.create,
        notificationCreate: Notification.create,
    };
    const created = [];
    const emitted = [];
    setIO({ to(room) { return { emit(event, payload) { emitted.push({ room, event, payload }); } }; } });

    Conversation.findById = async () => ({
        _id: CONVERSATION_ID,
        participants: [SENDER_ID, RECEIVER_ID],
        hiddenFor: [],
        save: async () => {},
    });
    User.findById = () => ({ select: async () => ({ _id: RECEIVER_ID, blockList: [] }) });
    Message.create = async (data) => {
        created.push(data);
        return {
            _id: "m1",
            ...data,
            populate: async () => {},
            toObject() { return { _id: "m1", ...data, conversationId: CONVERSATION_ID }; },
        };
    };
    Notification.create = async () => ({});

    const restore = () => {
        setIO(null);
        Conversation.findById = originals.conversationFind;
        User.findById = originals.userFind;
        Message.create = originals.messageCreate;
        Notification.create = originals.notificationCreate;
    };
    return { created, emitted, restore };
}

const request = (body) => ({
    params: { conversationId: CONVERSATION_ID },
    body,
    user: { _id: SENDER_ID, blockList: [] },
});

test("sendMessage stores a valid sticker with a readable preview and pushes it live", async () => {
    const { created, emitted, restore } = stubSendMessage();
    try {
        const res = response();
        await sendMessage(request({ stickerId: "faces-love" }), res);

        assert.equal(res.statusCode, 201);
        assert.equal(created.length, 1);
        assert.equal(created[0].type, "sticker");
        assert.equal(created[0].stickerId, "faces-love");
        assert.equal(created[0].content, STICKER_PREVIEW);
        assert.equal(emitted[0].event, "message:new");
        assert.equal(emitted[0].payload.message.stickerId, "faces-love");
    } finally {
        restore();
    }
});

test("sendMessage rejects unknown or malformed stickers and ignores text sent with a sticker", async () => {
    const { created, restore } = stubSendMessage();
    try {
        for (const stickerId of ["faces-nope", "", 7, { $ne: "" }, ["faces-smile"]]) {
            const res = response();
            await sendMessage(request({ stickerId }), res);
            assert.equal(res.statusCode, 400, `stickerId ${JSON.stringify(stickerId)} should be rejected`);
        }
        assert.equal(created.length, 0);

        const res = response();
        await sendMessage(request({ stickerId: "words-ok", content: "injected text" }), res);
        assert.equal(res.statusCode, 201);
        assert.equal(created[0].content, STICKER_PREVIEW);
    } finally {
        restore();
    }
});

test("plain text messages still work and are stored as text", async () => {
    const { created, restore } = stubSendMessage();
    try {
        const res = response();
        await sendMessage(request({ content: "  xin chào 😀  " }), res);
        assert.equal(res.statusCode, 201);
        assert.deepEqual(Object.keys(created[0]).sort(), ["content", "conversationId", "senderId"]);
        assert.equal(created[0].content, "xin chào 😀");

        const empty = response();
        await sendMessage(request({ content: "   " }), empty);
        assert.equal(empty.statusCode, 400);
    } finally {
        restore();
    }
});

test("sendMessage accepts only same-origin upload media and derives its type", async () => {
    const { created, emitted, restore } = stubSendMessage();
    try {
        for (const [extension, type, preview] of [["jpg", "image", "Đã gửi một ảnh"], ["webm", "video", "Đã gửi một video"]]) {
            const mediaUrl = `http://localhost:5000/uploads/123e4567-e89b-42d3-a456-426614174000.${extension}`;
            const res = response();
            await sendMessage({ ...request({ mediaUrl, content: "optional" }), protocol: "http", headers: { host: "localhost:5000" }, get(name) { return this.headers[name.toLowerCase()]; } }, res);
            assert.equal(res.statusCode, 201);
            assert.equal(created.at(-1).type, type);
            assert.equal(created.at(-1).mediaUrl, mediaUrl);
            assert.equal(created.at(-1).content, preview);
            assert.equal(res.body.newMessage.type, type);
            assert.equal(res.body.newMessage.mediaUrl, mediaUrl);
            assert.equal(emitted.at(-1).payload.message.type, type);
            assert.equal(emitted.at(-1).payload.message.mediaUrl, mediaUrl);
        }

        for (const mediaUrl of [
            "https://external.example/uploads/123e4567-e89b-42d3-a456-426614174000.jpg",
            "http://localhost:5000/uploads/../123e4567-e89b-42d3-a456-426614174000.jpg",
            "http://localhost:5000/uploads/123e4567-e89b-42d3-a456-426614174000.svg",
            "javascript:alert(1)",
        ]) {
            const res = response();
            await sendMessage({ ...request({ mediaUrl }), protocol: "http", headers: { host: "localhost:5000" }, get(name) { return this.headers[name.toLowerCase()]; } }, res);
            assert.equal(res.statusCode, 400, mediaUrl);
            assert.equal(res.body.message, "Tệp đính kèm không hợp lệ!");
        }

        const stickerMedia = response();
        await sendMessage({ ...request({ stickerId: "faces-love", mediaUrl: "http://localhost:5000/uploads/123e4567-e89b-42d3-a456-426614174000.jpg" }), protocol: "http", headers: { host: "localhost:5000" }, get(name) { return this.headers[name.toLowerCase()]; } }, stickerMedia);
        assert.equal(stickerMedia.statusCode, 400);
    } finally {
        restore();
    }
});
