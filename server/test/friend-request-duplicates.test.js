const test = require("node:test");
const assert = require("node:assert/strict");
const User = require("../models/User");
const FriendRequest = require("../models/FriendRequest");
const Notification = require("../models/Notification");
const {
  sendFriendRequest,
  getReceivedRequest,
} = require("../controllers/friendControllers");

const senderId = "sender-id";
const receiverId = "receiver-id";

function stubModels({ pendingRequests = [], senderFriends = [], receiverFriends = [] } = {}) {
  const originalUserFindById = User.findById;
  const originalRequestFindOne = FriendRequest.findOne;
  const originalRequestCreate = FriendRequest.create;
  const originalRequestFind = FriendRequest.find;
  const originalNotificationCreate = Notification.create;
  let createCount = 0;

  User.findById = async (id) => id.toString() === receiverId
    ? { _id: receiverId, blockList: [], friend: receiverFriends }
    : null;
  FriendRequest.findOne = async (query) => pendingRequests.find((request) =>
    request.status === query.status
      && query.$or.some((pair) => pair.senderId === request.senderId && pair.receiverId === request.receiverId)
  ) || null;
  FriendRequest.create = async (request) => {
    createCount += 1;
    return { _id: "new-request-id", ...request };
  };
  Notification.create = async () => ({});

  return {
    get createCount() { return createCount; },
    restore() {
      User.findById = originalUserFindById;
      FriendRequest.findOne = originalRequestFindOne;
      FriendRequest.create = originalRequestCreate;
      FriendRequest.find = originalRequestFind;
      Notification.create = originalNotificationCreate;
    },
    setReceivedRequests(requests) {
      FriendRequest.find = () => ({
        populate() { return this; },
        sort() { return Promise.resolve(requests); },
      });
    },
  };
}

function makeRequest(userFriends = []) {
  return {
    user: {
      _id: senderId,
      blockList: [],
      friend: userFriends,
    },
    params: { userId: receiverId },
  };
}

function makeResponse() {
  return {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

test("second pending request in the same direction returns 409", async (t) => {
  const stubs = stubModels({
    pendingRequests: [{ senderId, receiverId, status: "pending" }],
  });
  t.after(() => stubs.restore());
  const response = makeResponse();

  await sendFriendRequest(makeRequest(), response);

  assert.equal(response.statusCode, 409);
  assert.match(response.body.message, /đang chờ xử lý/i);
  assert.equal(stubs.createCount, 0);
});

test("reverse-direction pending request returns 409", async (t) => {
  const stubs = stubModels({
    pendingRequests: [{ senderId: receiverId, receiverId: senderId, status: "pending" }],
  });
  t.after(() => stubs.restore());
  const response = makeResponse();

  await sendFriendRequest(makeRequest(), response);

  assert.equal(response.statusCode, 409);
  assert.match(response.body.message, /đang chờ xử lý/i);
  assert.equal(stubs.createCount, 0);
});

test("existing friendship returns 409", async (t) => {
  const stubs = stubModels({ senderFriends: [receiverId] });
  t.after(() => stubs.restore());
  const response = makeResponse();

  await sendFriendRequest(makeRequest([receiverId]), response);

  assert.equal(response.statusCode, 409);
  assert.match(response.body.message, /đã là bạn bè/i);
  assert.equal(stubs.createCount, 0);
});

test("first friend request succeeds", async (t) => {
  const stubs = stubModels();
  t.after(() => stubs.restore());
  const response = makeResponse();

  await sendFriendRequest(makeRequest(), response);

  assert.equal(response.statusCode, 201);
  assert.equal(response.body.message, "Đã gửi lời mời kết bạn!");
  assert.equal(stubs.createCount, 1);
});

test("received requests retain only the newest request from each sender", async (t) => {
  const newestFromSender = { _id: "newest", senderId: { _id: "sender-a" }, createdAt: "2026-01-02" };
  const olderFromSender = { _id: "older", senderId: { _id: "sender-a" }, createdAt: "2026-01-01" };
  const fromAnotherSender = { _id: "other", senderId: { _id: "sender-b" }, createdAt: "2026-01-01" };
  const stubs = stubModels();
  stubs.setReceivedRequests([newestFromSender, fromAnotherSender, olderFromSender]);
  t.after(() => stubs.restore());
  const response = makeResponse();

  await getReceivedRequest({ user: { _id: receiverId } }, response);

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body.request, [newestFromSender, fromAnotherSender]);
});
