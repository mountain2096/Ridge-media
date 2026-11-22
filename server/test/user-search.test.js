const test = require("node:test");
const assert = require("node:assert/strict");
const User = require("../models/User");
const FriendRequest = require("../models/FriendRequest");
const { searchUsers } = require("../controllers/userControllers");

function response() {
    return {
        statusCode: 200,
        body: null,
        status(code) { this.statusCode = code; return this; },
        json(body) { this.body = body; return this; },
    };
}

test("user search includes legacy accounts without isLocked while excluding locked accounts", async () => {
    const originalUserFind = User.find;
    const originalFriendRequestFind = FriendRequest.find;
    let userFilter;
    User.find = (filter) => {
        userFilter = filter;
        return {
            select() { return this; },
            limit() { return this; },
            sort: async () => [],
        };
    };
    FriendRequest.find = () => ({ select: async () => [] });

    try {
        const res = response();
        await searchUsers({
            query: { q: "Ridge12" },
            user: { _id: "viewer", friend: [], blockList: [] },
        }, res);

        assert.equal(res.statusCode, 200);
        assert.deepEqual(userFilter.isLocked, { $ne: true });
        assert.equal(userFilter.username.$regex, "Ridge12");
        assert.deepEqual(res.body, { users: [] });
    } finally {
        User.find = originalUserFind;
        FriendRequest.find = originalFriendRequestFind;
    }
});
