const test = require("node:test");
const assert = require("node:assert/strict");
const Story = require("../models/Story");
const Notification = require("../models/Notification");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const { reactToStory, replyToStory, createStory, getStories } = require("../controllers/storyControllers");
const { setIO } = require("../utils/realtime");

const OWNER = "64b000000000000000000001", VIEWER = "64b000000000000000000002", SID = "64b000000000000000000003", CID = "64b000000000000000000004";
const res = () => ({ statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } });
function stubStory(story) {
  const old = [Story.findOne, Notification.create];
  let notifications = 0;
  Story.findOne = async () => story;
  Notification.create = async () => { notifications += 1; };
  return { get notifications() { return notifications; }, restore() { [Story.findOne, Notification.create] = old; } };
}

test("story reactions replace, deduplicate notifications, remove, and reject expired stories", async () => {
  const story = { _id: SID, authorId: OWNER, expiresAt: new Date(Date.now() + 10000), reactions: [], async save() {} };
  const state = stubStory(story);
  try {
    for (const type of ["love", "love", "wow"]) { const response = res(); await reactToStory({ method: "PUT", params: { id: SID }, body: { type }, user: { _id: VIEWER } }, response); assert.equal(response.statusCode, 200); }
    assert.equal(story.reactions.length, 1); assert.equal(story.reactions[0].type, "wow"); assert.equal(state.notifications, 2);
    const removed = res(); await reactToStory({ method: "DELETE", params: { id: SID }, user: { _id: VIEWER } }, removed); assert.equal(story.reactions.length, 0);
    Story.findOne = async () => null;
    const expired = res(); await reactToStory({ method: "PUT", params: { id: SID }, body: { type: "like" }, user: { _id: VIEWER } }, expired); assert.equal(expired.statusCode, 404);
  } finally { state.restore(); }
});

test("story reactions never notify the owner and list endpoint limits visibility", async () => {
  const story = { _id: SID, authorId: OWNER, expiresAt: new Date(Date.now() + 10000), reactions: [{ user: VIEWER, type: "haha" }], async save() {}, async populate(path) { if (path === "authorId") this.authorId = { _id: OWNER }; else this.reactions = this.reactions.map((item) => ({ ...item, user: { _id: (item.user?._id || item.user).toString(), username: "User" } })); } };
  const state = stubStory(story);
  const oldFind = Story.find;
  Story.find = () => ({ populate(path) { this.paths = [...(this.paths || []), path]; return this; }, sort: async () => { story.authorId = { _id: OWNER }; story.reactions = story.reactions.map((item) => ({ ...item, user: { _id: (item.user?._id || item.user).toString(), username: "User" } })); return [story]; } });
  try {
    await reactToStory({ method: "PUT", params: { id: SID }, body: { type: "like" }, user: { _id: OWNER } }, res()); assert.equal(state.notifications, 0);
    const owner = res(); await getStories({ user: { _id: OWNER, friend: [] } }, owner); assert.equal(owner.body.stories[0].reactions.length, 2);
    const viewer = res(); await getStories({ user: { _id: VIEWER, friend: [] } }, viewer); assert.equal(viewer.body.stories[0].reactions.length, 1);
  } finally { state.restore(); Story.find = oldFind; }
});

test("story media rejects external hosts and media type extension mismatch", async () => {
  const oldCreate = Story.create; Story.create = async (data) => ({ ...data, populate: async () => {} });
  try {
    for (const mediaUrl of ["https://evil.example/a.jpg", "/uploads/a.txt"]) {
      const response = res(); await createStory({ body: { mediaUrl, mediaType: "image" }, user: { _id: OWNER } }, response); assert.equal(response.statusCode, 400);
    }
    for (const mediaUrl of ["/uploads/a.jpg", "http://localhost:5000/uploads/a.mp4"]) {
      const response = res(); await createStory({ body: { mediaUrl, mediaType: mediaUrl.endsWith("mp4") ? "video" : "image" }, user: { _id: OWNER } }, response); assert.equal(response.statusCode, 201);
    }
  } finally { Story.create = oldCreate; }
});

test("story reply snapshots media and caption into a direct message; own and empty replies fail", async () => {
  const story = { _id: SID, authorId: OWNER, mediaType: "image", mediaUrl: "/uploads/story.jpg", caption: "hello", expiresAt: new Date(Date.now() + 10000) };
  const state = stubStory(story);
  const originals = [Conversation.findOne, Conversation.create, Message.create];
  const conversation = { _id: CID, participants: [VIEWER, OWNER], hiddenFor: [], async save() {} };
  let created;
  Conversation.findOne = async () => conversation; Conversation.create = async () => conversation;
  Message.create = async (data) => { created = { ...data, _id: SID, toObject() { return { ...this }; }, async populate() { return this; } }; return created; };
  setIO({ to: () => ({ emit() {} }) });
  try {
    const response = res(); await replyToStory({ params: { id: SID }, body: { content: "reply" }, user: { _id: VIEWER } }, response);
    assert.equal(response.statusCode, 201); assert.deepEqual(created.storyRef, { storyId: SID, ownerId: OWNER, mediaType: "image", mediaUrl: "/uploads/story.jpg", caption: "hello" });
    for (const body of [{ content: " " }, { content: "reply" }]) { const result = res(); await replyToStory({ params: { id: SID }, body, user: { _id: body.content === " " ? VIEWER : OWNER } }, result); assert.equal(result.statusCode, 400); }
  } finally { setIO(null); state.restore(); [Conversation.findOne, Conversation.create, Message.create] = originals; }
});
