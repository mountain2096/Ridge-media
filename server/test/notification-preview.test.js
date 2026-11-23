const test = require("node:test");
const assert = require("node:assert/strict");
const Notification = require("../models/Notification");
const { getNotification } = require("../controllers/notificationController");

test("getNotification populates sender, post and comment previews and limits newest results to 50", async () => {
  const originalFind = Notification.find;
  const calls = [];
  const rows = [
    { _id: "old-message", type: "message" },
    { _id: "n1", type: "like", postId: { _id: "p1", content: "preview" }, commentId: { _id: "c1", content: "comment" } },
  ];
  let filter;
  const query = {
    populate(...args) { calls.push(["populate", ...args]); return this; },
    sort(value) { calls.push(["sort", value]); return this; },
    limit(value) { calls.push(["limit", value]); return Promise.resolve(rows.filter((row) => row.type !== filter.type.$ne)); },
  };
  Notification.find = (value) => { filter = value; calls.push(["find", value]); return query; };
  const res = { statusCode: 200, body: null, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
  try {
    await getNotification({ user: { _id: "u1" } }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.notifications[0].postId.content, "preview");
    assert.equal(res.body.notifications[0].commentId.content, "comment");
    assert.deepEqual(calls, [
      ["find", { recipientId: "u1", type: { $ne: "message" } }],
      ["populate", "senderId", "username profilePicture"],
      ["populate", { path: "postId", select: "content image video originalPostId status", match: { status: "active" } }],
      ["populate", { path: "commentId", select: "content", match: { status: "active" } }],
      ["sort", { createdAt: -1 }],
      ["limit", 50],
    ]);
  } finally {
    Notification.find = originalFind;
  }
});
