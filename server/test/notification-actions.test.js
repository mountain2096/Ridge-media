const test = require("node:test");
const assert = require("node:assert/strict");
const Notification = require("../models/Notification");
const {
  deleteNotification,
  deleteAllNotifications,
  markAllNotificationsAsRead,
} = require("../controllers/notificationController");

function response() {
  return { statusCode: 200, body: null, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
}

test("deleteNotification deletes only the current user's notification", async () => {
  const original = Notification.findOneAndDelete;
  let filter;
  Notification.findOneAndDelete = async (value) => { filter = value; return { _id: "n1" }; };
  try {
    const res = response();
    await deleteNotification({ params: { id: "n1" }, user: { _id: "u1" } }, res);
    assert.deepEqual(filter, { _id: "n1", recipientId: "u1" });
    assert.deepEqual(res.body, { ok: true });
  } finally { Notification.findOneAndDelete = original; }
});

test("deleteNotification refuses another user's notification and leaves it intact", async () => {
  const original = Notification.findOneAndDelete;
  const notifications = [{ _id: "n1", recipientId: "u2" }];
  Notification.findOneAndDelete = async ({ _id, recipientId }) => {
    const index = notifications.findIndex((item) => item._id === _id && item.recipientId === recipientId);
    return index < 0 ? null : notifications.splice(index, 1)[0];
  };
  try {
    const res = response();
    await deleteNotification({ params: { id: "n1" }, user: { _id: "u1" } }, res);
    assert.equal(res.statusCode, 404);
    assert.equal(notifications.length, 1);
  } finally { Notification.findOneAndDelete = original; }
});

test("deleteAllNotifications filters by the current recipient and returns the deleted count", async () => {
  const original = Notification.deleteMany;
  let filter;
  Notification.deleteMany = async (value) => { filter = value; return { deletedCount: 3 }; };
  try {
    const res = response();
    await deleteAllNotifications({ user: { _id: "u1" } }, res);
    assert.deepEqual(filter, { recipientId: "u1" });
    assert.deepEqual(res.body, { deleted: 3 });
  } finally { Notification.deleteMany = original; }
});

test("markAllNotificationsAsRead filters by the current recipient", async () => {
  const original = Notification.updateMany;
  let args;
  Notification.updateMany = async (...value) => { args = value; };
  try {
    const res = response();
    await markAllNotificationsAsRead({ user: { _id: "u1" } }, res);
    assert.deepEqual(args, [{ recipientId: "u1" }, { isRead: true }]);
    assert.deepEqual(res.body, { ok: true });
  } finally { Notification.updateMany = original; }
});
