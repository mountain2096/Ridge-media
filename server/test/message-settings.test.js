const test = require("node:test");
const assert = require("node:assert/strict");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const User = require("../models/User");
const { updateNickname, setConversationMute, getConversations } = require("../controllers/messageCotrollers");

const ME = "64b000000000000000000001";
const OTHER = "64b000000000000000000002";
const OUTSIDER = "64b000000000000000000003";
const CID = "64b0000000000000000000c1";
function response() {
  return { statusCode: 200, body: null, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
}
function conversation(extra = {}) {
  return { _id: CID, participants: [ME, OTHER], nicknames: [], mutedBy: [], hiddenFor: [], save: async () => {}, toObject() { return { ...this }; }, ...extra };
}

test("nickname can be set and cleared by a participant", async () => {
  const original = Conversation.findById;
  const item = conversation();
  Conversation.findById = async () => item;
  try {
    const set = response();
    await updateNickname({ params: { conversationId: CID }, body: { userId: OTHER, nickname: "  Bạn thân  " }, user: { _id: ME } }, set);
    assert.equal(set.statusCode, 200);
    assert.equal(item.nicknames[0].nickname, "Bạn thân");
    const clear = response();
    await updateNickname({ params: { conversationId: CID }, body: { userId: OTHER, nickname: "" }, user: { _id: ME } }, clear);
    assert.deepEqual(item.nicknames, []);
  } finally { Conversation.findById = original; }
});

test("nickname rejects non-participants and values over 40 characters", async () => {
  const original = Conversation.findById;
  Conversation.findById = async () => conversation();
  try {
    const forbidden = response();
    await updateNickname({ params: { conversationId: CID }, body: { userId: OTHER, nickname: "Name" }, user: { _id: OUTSIDER } }, forbidden);
    assert.equal(forbidden.statusCode, 403);
    const tooLong = response();
    await updateNickname({ params: { conversationId: CID }, body: { userId: OTHER, nickname: "x".repeat(41) }, user: { _id: ME } }, tooLong);
    assert.equal(tooLong.statusCode, 400);
  } finally { Conversation.findById = original; }
});

test("mute changes only the requesting participant's muted state", async () => {
  const original = Conversation.findById;
  const item = conversation({ mutedBy: [OTHER] });
  Conversation.findById = async () => item;
  try {
    const res = response();
    await setConversationMute({ params: { conversationId: CID }, body: { muted: true }, user: { _id: ME } }, res);
    assert.deepEqual(item.mutedBy, [OTHER, ME]);
    await setConversationMute({ params: { conversationId: CID }, body: { muted: false }, user: { _id: ME } }, response());
    assert.deepEqual(item.mutedBy, [OTHER]);
  } finally { Conversation.findById = original; }
});

test("getConversations returns nicknames and excludes muted unread messages", async () => {
  const original = { find: Conversation.find, usersFind: User.find, count: Message.countDocuments };
  const items = [conversation({ mutedBy: [ME], nicknames: [{ user: OTHER, nickname: "Buddy" }] }), conversation({ _id: "second", participants: [ME, OUTSIDER] })];
  Conversation.find = () => ({ populate() { return this; }, sort: async () => items });
  User.find = () => ({ select: async () => [{ _id: OTHER, blockList: [] }, { _id: OUTSIDER, blockList: [] }] });
  let countCalls = 0;
  Message.countDocuments = async () => { countCalls += 1; return 3; };
  try {
    const res = response();
    await getConversations({ user: { _id: ME, blockList: [] } }, res);
    assert.equal(res.body.conversations[0].isMuted, true);
    assert.equal(res.body.conversations[0].unreadCount, 0);
    assert.deepEqual(res.body.conversations[0].nicknames, [{ user: OTHER, nickname: "Buddy" }]);
    assert.equal(res.body.conversations[1].unreadCount, 3);
    assert.equal(countCalls, 1);
  } finally { Conversation.find = original.find; User.find = original.usersFind; Message.countDocuments = original.count; }
});
