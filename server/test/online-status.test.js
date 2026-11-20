const test = require("node:test");
const assert = require("node:assert/strict");
const User = require("../models/User");
const userControllers = require("../controllers/userControllers");
const friendControllers = require("../controllers/friendControllers");

const originalUpdateOne = User.updateOne;
const originalFindById = User.findById;

test.afterEach(() => {
    User.updateOne = originalUpdateOne;
    User.findById = originalFindById;
});

function responseStub() {
    return {
        statusCode: null,
        body: undefined,
        ended: false,
        status(statusCode) {
            this.statusCode = statusCode;
            return this;
        },
        end() {
            this.ended = true;
            return this;
        },
        json(body) {
            this.body = body;
            return this;
        },
    };
}

test("heartbeat sets lastActiveAt and returns 204", async () => {
    let updateCall;
    User.updateOne = async (...args) => { updateCall = args; };
    const response = responseStub();

    await userControllers.heartbeat({ user: { _id: "user-1" } }, response);

    assert.equal(response.statusCode, 204);
    assert.equal(response.ended, true);
    assert.equal(updateCall[0]._id, "user-1");
    assert.ok(updateCall[1].$set.lastActiveAt instanceof Date);
    assert.ok(Math.abs(Date.now() - updateCall[1].$set.lastActiveAt.getTime()) < 1000);
});

test("heartbeat skips the write when lastActiveAt is less than 30 seconds old", async () => {
    let writeCount = 0;
    User.updateOne = async () => { writeCount += 1; };
    const response = responseStub();

    await userControllers.heartbeat({
        user: { _id: "user-1", lastActiveAt: new Date(Date.now() - 15_000) },
    }, response);

    assert.equal(response.statusCode, 204);
    assert.equal(response.ended, true);
    assert.equal(writeCount, 0);
});

test("friends response marks online, offline and missing activity without exposing timestamps or non-friends", async () => {
    const now = Date.now();
    const rows = [
        { _id: "online", username: "Online", profilePicture: "online.png", bio: "", lastActiveAt: new Date(now - 60_000) },
        { _id: "offline", username: "Offline", profilePicture: "", bio: "", lastActiveAt: new Date(now - 121_000) },
        { _id: "never-active", username: "Never", profilePicture: "", bio: "" },
    ];
    User.findById = (id) => {
        assert.equal(id, "requesting-user");
        return {
            populate: async (path, fields) => {
                assert.equal(path, "friend");
                assert.match(fields, /lastActiveAt/);
                return { friend: rows };
            },
        };
    };
    const response = responseStub();

    await friendControllers.getListFriend({ user: { _id: "requesting-user" } }, response);

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.body.friend.map(({ _id, isOnline }) => ({ _id, isOnline })), [
        { _id: "online", isOnline: true },
        { _id: "offline", isOnline: false },
        { _id: "never-active", isOnline: false },
    ]);
    assert.equal(response.body.friend.length, 3);
    assert.ok(!response.body.friend.some((friend) => friend._id === "non-friend"));
    assert.ok(response.body.friend.every((friend) => !Object.hasOwn(friend, "lastActiveAt")));
});

test("lastActiveAt is optional and has no default", () => {
    const lastActivePath = User.schema.path("lastActiveAt");
    assert.ok(lastActivePath);
    assert.equal(lastActivePath.options.default, undefined);
});
