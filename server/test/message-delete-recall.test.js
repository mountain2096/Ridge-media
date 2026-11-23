const test = require("node:test");
const assert = require("node:assert/strict");
const Message = require("../models/Message");
const Conversation = require("../models/Conversation");
const { deleteMessageForMe, recallMessage } = require("../controllers/messageCotrollers");

const ME = "64b000000000000000000001";
const OTHER = "64b000000000000000000002";
const OUTSIDER = "64b000000000000000000003";
const MID = "64b0000000000000000000d1";
const CID = "64b0000000000000000000c1";
const response = () => ({ statusCode: 200, body: null, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } });

function setup() {
  const originals = [Message.findById, Message.updateOne, Conversation.findById];
  let saves = 0;
  const message = { _id: MID, conversationId: CID, senderId: ME, content: "hello", mediaUrl: "/uploads/a.jpg", stickerId: "cat", sharedPostId: "post", type: "image", recalledAt: null, async save() { saves += 1; } };
  const conversation = { _id: CID, participants: [ME, OTHER] };
  Message.findById = async () => message;
  Message.updateOne = async (_filter, update) => { message.deletedFor = [update.$addToSet.deletedFor]; };
  Conversation.findById = async () => conversation;
  return { message, get saves() { return saves; }, restore() { [Message.findById, Message.updateOne, Conversation.findById] = originals; } };
}

test("delete for me scopes the update to the participant and returns 200", async () => {
  const state = setup();
  try {
    const res = response();
    await deleteMessageForMe({ params: { messageId: MID }, user: { _id: ME } }, res);
    assert.equal(res.statusCode, 200);
    assert.deepEqual(state.message.deletedFor, [ME]);
  } finally { state.restore(); }
});

test("delete for me rejects non-participants", async () => {
  const state = setup();
  try {
    const res = response();
    await deleteMessageForMe({ params: { messageId: MID }, user: { _id: OUTSIDER } }, res);
    assert.equal(res.statusCode, 403);
  } finally { state.restore(); }
});

test("sender recall clears attachments and is idempotent", async () => {
  const state = setup();
  try {
    const res = response();
    await recallMessage({ params: { messageId: MID }, user: { _id: ME } }, res);
    assert.equal(res.statusCode, 200);
    assert.ok(state.message.recalledAt instanceof Date);
    assert.equal(state.message.content, "Tin nhắn đã được thu hồi");
    assert.equal(state.message.mediaUrl, null);
    assert.equal(state.message.stickerId, null);
    assert.equal(state.message.sharedPostId, null);
    assert.equal(state.message.type, "image");
    const recalledAt = state.message.recalledAt;
    await recallMessage({ params: { messageId: MID }, user: { _id: ME } }, response());
    assert.equal(state.message.recalledAt, recalledAt);
    assert.equal(state.saves, 1);
  } finally { state.restore(); }
});

test("recall rejects the other participant and malformed ids return 400", async () => {
  const state = setup();
  try {
    const forbidden = response();
    await recallMessage({ params: { messageId: MID }, user: { _id: OTHER } }, forbidden);
    assert.equal(forbidden.statusCode, 403);
    const original = Message.findById;
    Message.findById = async () => { throw Object.assign(new Error("bad id"), { name: "CastError" }); };
    const invalid = response();
    await deleteMessageForMe({ params: { messageId: "bad" }, user: { _id: ME } }, invalid);
    assert.equal(invalid.statusCode, 400);
    Message.findById = original;
  } finally { state.restore(); }
});
