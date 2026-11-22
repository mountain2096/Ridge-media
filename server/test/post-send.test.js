const test = require("node:test");
const assert = require("node:assert/strict");
const Post = require("../models/Post");
const User = require("../models/User");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const Notification = require("../models/Notification");
const { sendPost } = require("../controllers/postControllers");

const ids = ["64b000000000000000000001", "64b000000000000000000002", "64b000000000000000000003", "64b000000000000000000004"];
const response = () => ({ statusCode: 200, body: null, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } });

function setup({ privacy = "public", blocked = [] } = {}) {
  const originals = [Post.findById, User.findById, Conversation.findOne, Conversation.create, Message.create, Notification.create];
  const users = new Map(ids.map((id, index) => [id, { _id: id, friend: [1, 3].includes(index) ? ["author"] : [], blockList: blocked.includes(id) ? [ids[0]] : [] }]));
  users.set("author", { _id: "author", blockList: [] });
  Post.findById = async () => ({ _id: "post", authorId: "author", privacy, status: "active" });
  User.findById = (id) => {
    const user = users.get(String(id)) || null;
    return { select: async () => user, then(resolve, reject) { return Promise.resolve(user).then(resolve, reject); } };
  };
  const conversations = [];
  Conversation.findOne = async ({ participants: idsIn }) => conversations.find((item) => idsIn.$all.every((id) => item.participants.includes(String(id)))) || null;
  Conversation.create = async ({ participants }) => { const item = { _id: `c${conversations.length}`, participants: participants.map(String), save: async () => {} }; conversations.push(item); return item; };
  const messages = [];
  Message.create = async (data) => { const item = { _id: `m${messages.length}`, ...data, populate: async () => {}, toObject() { return { ...this }; } }; messages.push(item); return item; };
  Notification.create = async () => ({});
  return { users, conversations, messages, restore() { [Post.findById, User.findById, Conversation.findOne, Conversation.create, Message.create, Notification.create] = originals; } };
}

test("sendPost sends to multiple recipients and skips inaccessible and blocked recipients", async () => {
  const mock = setup({ privacy: "friends", blocked: [ids[3]] });
  try {
    const res = response();
    await sendPost({ params: { id: "post" }, body: { recipientIds: [ids[1], ids[2], ids[3], ids[0]] }, user: { _id: ids[0], friend: ["author", ids[1], ids[2], ids[3]], blockList: [] } }, res);
    assert.equal(res.statusCode, 201);
    assert.deepEqual(res.body.sent, [ids[1]]);
    assert.equal(res.body.failed.length, 3);
    assert.match(res.body.failed[0].reason, /không thể xem/i);
    assert.match(res.body.failed[1].reason, /chặn/i);
    assert.equal(mock.messages.length, 1);
  } finally { mock.restore(); }
});

test("sendPost sends the post to two recipients and sends optional text first", async () => {
  const mock = setup({ privacy: "public" });
  try {
    const res = response();
    await sendPost({ params: { id: "post" }, body: { recipientIds: [ids[1], ids[2]], message: "Hello" }, user: { _id: ids[0], friend: ids.slice(1), blockList: [] } }, res);
    assert.equal(res.statusCode, 201);
    assert.deepEqual(res.body.sent, ids.slice(1, 3));
    assert.deepEqual(mock.messages.map((item) => item.content), ["Hello", "Đã chia sẻ một bài viết", "Hello", "Đã chia sẻ một bài viết"]);
  } finally { mock.restore(); }
});

test("sendPost rejects invalid recipientIds", async () => {
  const mock = setup();
  try {
    const res = response();
    await sendPost({ params: { id: "post" }, body: { recipientIds: ["bad"] }, user: { _id: ids[0] } }, res);
    assert.equal(res.statusCode, 400);
  } finally { mock.restore(); }
});
