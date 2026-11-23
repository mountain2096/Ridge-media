const test = require("node:test");
const assert = require("node:assert/strict");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const User = require("../models/User");
const { sendMessage, createAndEmitMessage } = require("../controllers/messageCotrollers");
const { setIO } = require("../utils/realtime");

const ME = "64b000000000000000000001";
const OTHER = "64b000000000000000000002";
const CID = "64b0000000000000000000c1";
const TARGET = "64b0000000000000000000d1";
const OTHER_CID = "64b0000000000000000000c2";
const response = () => ({ statusCode: 200, body: null, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } });

function setup(target) {
  const originals = [Conversation.findById, Message.findOne, Message.create, User.findById];
  const conversation = { _id: CID, participants: [ME, OTHER], hiddenFor: [], async save() {} };
  let created;
  Conversation.findById = async () => conversation;
  Message.findOne = async (filter) => target && String(target._id) === String(filter._id) && String(target.conversationId) === String(filter.conversationId) && !target.recalledAt && !(target.deletedFor || []).includes(ME) ? target : null;
  Message.create = async (data) => {
    created = { _id: "64b0000000000000000000d2", ...data, senderId: data.senderId, async populate(path) {
      if (path === "senderId") this.senderId = { _id: ME, username: "Me", profilePicture: null };
      else if (path.path === "replyTo" && this.replyTo) this.replyTo = { ...target, senderId: { _id: target.senderId, username: "Author", profilePicture: null } };
      return this;
    }, toObject() { return { ...this }; } };
    return created;
  };
  User.findById = () => ({ select: async () => ({ _id: OTHER, blockList: [] }) });
  return { conversation, get created() { return created; }, restore() { [Conversation.findById, Message.findOne, Message.create, User.findById] = originals; } };
}

test("reply sends can target own or another participant's message", async () => {
  for (const senderId of [ME, OTHER]) {
    const state = setup({ _id: TARGET, conversationId: CID, senderId, content: "original", type: "text", recalledAt: null, deletedFor: [] });
    try {
      const res = response();
      await sendMessage({ params: { conversationId: CID }, body: { content: "reply", replyToMessageId: TARGET }, user: { _id: ME, blockList: [] } }, res);
      assert.equal(res.statusCode, 201);
      assert.equal(state.created.replyTo._id, TARGET);
      assert.equal(res.body.newMessage.replyTo.content, "original");
    } finally { state.restore(); }
  }
});

test("reply target must be in the same conversation and visible, unrecalled", async () => {
  for (const target of [null, { _id: TARGET, conversationId: OTHER_CID, senderId: OTHER }, { _id: TARGET, conversationId: CID, recalledAt: new Date() }, { _id: TARGET, conversationId: CID, deletedFor: [ME] }]) {
    const state = setup(target);
    try {
      const res = response();
      await sendMessage({ params: { conversationId: CID }, body: { content: "reply", replyToMessageId: TARGET }, user: { _id: ME, blockList: [] } }, res);
      assert.equal(res.statusCode, 400);
      assert.match(res.body.message, /trả lời/);
    } finally { state.restore(); }
  }
});

test("reply target id must be a valid ObjectId", async () => {
  const state = setup(null);
  try {
    const res = response();
    await sendMessage({ params: { conversationId: CID }, body: { content: "reply", replyToMessageId: "bad" }, user: { _id: ME, blockList: [] } }, res);
    assert.equal(res.statusCode, 400);
    assert.match(res.body.message, /trả lời/);
  } finally { state.restore(); }
});

test("new-message reply preview masks a recalled original and its media", async () => {
  const target = { _id: TARGET, conversationId: CID, senderId: OTHER, content: "Tin nhắn đã được thu hồi", type: "image", mediaUrl: "/secret.jpg", recalledAt: new Date(), deletedFor: [] };
  const state = setup(target);
  const emitted = [];
  setIO({ to: () => ({ emit: (_event, payload) => emitted.push(payload) }) });
  try {
    await createAndEmitMessage(state.conversation, ME, OTHER, { content: "reply" }, TARGET);
    assert.equal(emitted.length, 2);
    assert.equal(emitted[0].message.replyTo.content, "Tin nhắn đã được thu hồi");
    assert.equal(emitted[0].message.replyTo.mediaUrl, null);
  } finally { setIO(null); state.restore(); }
});

test("new-message payload hides reply previews deleted for that recipient", async () => {
  const target = { _id: TARGET, conversationId: CID, senderId: OTHER, content: "private for me", type: "text", recalledAt: null, deletedFor: [OTHER] };
  const state = setup(target);
  const emitted = [];
  setIO({ to: () => ({ emit: (_event, payload) => emitted.push(payload) }) });
  try {
    await createAndEmitMessage(state.conversation, ME, OTHER, { content: "reply" }, TARGET);
    assert.equal(emitted[0].message.replyTo, null);
    assert.equal(emitted[1].message.replyTo.content, "private for me");
  } finally { setIO(null); state.restore(); }
});
