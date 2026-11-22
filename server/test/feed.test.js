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
    let countFilter;
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
        filter = query;
        return chain;
    };
    Post.countDocuments = async (query) => { countFilter = query; return 73; };
    User.find = () => ({ select: async () => [{ _id: "blocked-me" }] });

    try {
        const res = response();
        await getPosts({
            query: { page: "3", limit: "10" },
            user: { _id: "viewer", friend: ["friend"], blockList: ["blocked"] , savedPosts: [] },
        }, res);

        assert.equal(res.statusCode, 200);
        assert.equal(filter.status, "active");
        assert.equal("video" in filter, false);
        assert.equal(countFilter, filter);
        assert.deepEqual(filter.authorId.$nin, ["blocked", "blocked-me"]);
        assert.deepEqual(filter.$or, [
            { privacy: "public" },
            { authorId: "viewer" },
            { privacy: "friends", authorId: { $in: ["friend"] } },
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

test("video feed filters media and author with the same paginated count query", async (t) => {
    const originals = { find: Post.find, count: Post.countDocuments, users: User.find };
    t.after(() => {
        Post.find = originals.find;
        Post.countDocuments = originals.count;
        User.find = originals.users;
    });
    let filter;
    let countFilter;
    let skip;
    let limit;
    const chain = {
        populate() { return this; }, sort() { return this; },
        skip(value) { skip = value; return this; },
        limit(value) { limit = value; return this; },
        then(resolve, reject) { return Promise.resolve([]).then(resolve, reject); },
    };
    Post.find = (query) => { filter = query; return chain; };
    Post.countDocuments = async (query) => { countFilter = query; return 21; };
    User.find = () => ({ select: async () => [{ _id: "blocked-me" }] });

    const res = response();
    await getPosts({
        query: { media: "video", authorId: "0123456789abcdef01234567", page: "2", limit: "5" },
        user: { _id: "viewer", friend: ["friend"], blockList: ["blocked"], savedPosts: [] },
    }, res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual(filter.video, { $nin: ["", null] });
    assert.deepEqual(filter.authorId, { $eq: "0123456789abcdef01234567", $nin: ["blocked", "blocked-me"] });
    assert.deepEqual(filter.$or, [
        { privacy: "public" },
        { authorId: "viewer" },
        { privacy: "friends", authorId: { $in: ["friend"] } },
    ]);
    assert.equal(filter.status, "active");
    assert.equal(countFilter, filter);
    assert.equal(skip, 5);
    assert.equal(limit, 5);
    assert.deepEqual(res.body.pagination, { page: 2, limit: 5, total: 21, pages: 5 });
});

test("feed rejects invalid media query values", async () => {
    for (const media of ["image", ["video", "video"], ""]) {
        const res = response();
        await getPosts({ query: { media }, user: { _id: "viewer" } }, res);
        assert.equal(res.statusCode, 400);
        assert.equal(res.body.message, "Tham số media không hợp lệ!");
    }
});

test("feed rejects invalid or excessive page size", async () => {
    const res = response();
    await getPosts({ query: { limit: "1000" }, user: { _id: "viewer" } }, res);
    assert.equal(res.statusCode, 400);
});
