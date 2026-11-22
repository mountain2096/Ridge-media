const test = require("node:test");
const assert = require("node:assert/strict");
const User = require("../models/User");
const Post = require("../models/Post");
const Comment = require("../models/Comment");
const FriendRequest = require("../models/FriendRequest");
const Report = require("../models/Report");

test("audit model fields and constraints are present", () => {
    assert.equal(User.schema.path("dateOfBirth").instance, "Date");
    assert.equal(User.schema.path("isLocked").defaultValue, false);
    assert.equal(User.schema.path("username").options.unique, true);
    assert.equal(Post.schema.path("privacy").defaultValue, "public");
    assert.equal(Post.schema.path("status").defaultValue, "active");
    assert.ok(Post.schema.path("originalPostId"));
    assert.equal(Post.schema.path("content").options.required.call({ originalPostId: "root" }), false);
    assert.equal(Comment.schema.path("status").defaultValue, "active");
    assert.ok(Report.schema);

    const pendingRequestIndex = FriendRequest.schema.indexes().find(([keys, options]) =>
        keys.senderId === 1 && keys.receiverId === 1 && options.name === "unique_pending_friend_request"
    );
    assert.ok(pendingRequestIndex);
    assert.equal(pendingRequestIndex[1].unique, true);
    assert.deepEqual(pendingRequestIndex[1].partialFilterExpression, { status: "pending" });
});
