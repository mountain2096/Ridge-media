const test = require("node:test");
const assert = require("node:assert/strict");
const User = require("../models/User");
const { canAccessPost } = require("../utils/postAccess");

const viewerId = "64b000000000000000000001";
const authorId = "64b000000000000000000002";
const viewer = (extra = {}) => ({ _id: viewerId, friend: [], blockList: [], ...extra });
const post = (privacy, extra = {}) => ({ _id: "64b0000000000000000000a1", authorId, privacy, status: "active", ...extra });

test("post access allows public and owner, and limits private and friends posts", async () => {
    const original = User.findById;
    let author = { _id: authorId, blockList: [] };
    User.findById = () => ({ select: async () => author });
    try {
        assert.equal(await canAccessPost(viewer(), post("private")), false);
        assert.equal(await canAccessPost(viewer(), post("friends")), false);
        assert.equal(await canAccessPost(viewer({ friend: [authorId] }), post("friends")), true);
        assert.equal(await canAccessPost(viewer({ _id: authorId }), post("private", { authorId })), true);
        assert.equal(await canAccessPost(viewer(), post("public")), true);
        author = { _id: authorId, blockList: [viewerId] };
        assert.equal(await canAccessPost(viewer(), post("public")), false);
        author = { _id: authorId, blockList: [] };
        assert.equal(await canAccessPost(viewer({ blockList: [authorId] }), post("public")), false);
    } finally { User.findById = original; }
});

test("post access denies posts that are inactive or whose author is missing", async () => {
    const original = User.findById;
    User.findById = () => ({ select: async () => null });
    try {
        assert.equal(await canAccessPost(viewer(), post("public", { status: "deleted" })), false);
        assert.equal(await canAccessPost(viewer(), post("public")), false);
    } finally { User.findById = original; }
});
