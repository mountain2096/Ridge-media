const test = require("node:test");
const assert = require("node:assert/strict");
const Post = require("../models/Post");
const User = require("../models/User");
const { getPosts } = require("../controllers/postControllers");

function response() {
    return {
        statusCode: 200,
        body: null,
        status(code) { this.statusCode = code; return this; },
        json(body) { this.body = body; return this; },
    };
}

test("feed filters privacy and both block directions, then paginates", async () => {
    const originalFindPosts = Post.find;
    const originalCount = Post.countDocuments;
    const originalFindUsers = User.find;
    let filter;
    let skip;
    let limit;
    const chain = {
        populate() { return this; },
        sort() { return this; },
        skip(value) { skip = value; return this; },
        limit(value) { limit = value; return this; },
        then(resolve, reject) { return Promise.resolve([]).then(resolve, reject); },
    };
    Post.find = (query) => {
        if (query.authorId?.$in) return { distinct: async () => ["source-post"] };
        if (query.status?.$ne) return { distinct: async () => ["inactive-source"] };
        filter = query;
        return chain;
    };
    Post.countDocuments = async () => 73;
    User.find = () => ({ select: async () => [{ _id: "blocked-me" }] });

    try {
        const res = response();
        await getPosts({
            query: { page: "3", limit: "10" },
            user: { _id: "viewer", friend: ["friend"], blockList: ["blocked"] , savedPosts: [] },
        }, res);

        assert.equal(res.statusCode, 200);
        assert.equal(filter.status, "active");
        assert.deepEqual(filter.authorId.$nin, ["blocked", "blocked-me"]);
        assert.deepEqual(filter.$and[0].$or, [
            { privacy: "public" },
            { authorId: "viewer" },
            { privacy: "friends", authorId: { $in: ["friend"] } },
        ]);
        assert.deepEqual(filter.$and[1].$or, [
            { originalPostId: null },
            { originalPostId: { $nin: ["source-post", "inactive-source"] } },
        ]);
        assert.equal(skip, 20);
        assert.equal(limit, 10);
        assert.deepEqual(res.body.pagination, { page: 3, limit: 10, total: 73, pages: 8 });
    } finally {
        Post.find = originalFindPosts;
        Post.countDocuments = originalCount;
        User.find = originalFindUsers;
    }
});

test("feed rejects invalid or excessive page size", async () => {
    const res = response();
    await getPosts({ query: { limit: "1000" }, user: { _id: "viewer" } }, res);
    assert.equal(res.statusCode, 400);
});
