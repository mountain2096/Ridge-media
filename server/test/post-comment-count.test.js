const test = require("node:test");
const assert = require("node:assert/strict");
const Post = require("../models/Post");
const Comment = require("../models/Comment");
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

async function readPostsWithComments(t, commentRows) {
    const originals = {
        findPosts: Post.find,
        countPosts: Post.countDocuments,
        findUsers: User.find,
        aggregate: Comment.aggregate,
    };
    t.after(() => {
        Post.find = originals.findPosts;
        Post.countDocuments = originals.countPosts;
        User.find = originals.findUsers;
        Comment.aggregate = originals.aggregate;
    });

    const post = {
        _id: "post-1",
        authorId: { _id: "author-1", username: "Author" },
        originalPostId: null,
        likes: [],
        toObject() { return { ...this }; },
        populated() { return undefined; },
    };
    const chain = {
        populate() { return this; },
        sort() { return this; },
        skip() { return this; },
        limit() { return this; },
        then(resolve, reject) { return Promise.resolve([post]).then(resolve, reject); },
    };
    let aggregateCalls = 0;
    let pipeline;
    Post.find = () => chain;
    Post.countDocuments = async () => 1;
    User.find = () => ({ select: async () => [] });
    Comment.aggregate = async (query) => {
        aggregateCalls += 1;
        pipeline = query;
        const match = query[0].$match;
        const grouped = new Map();
        for (const row of commentRows) {
            if (row.status === match.status && match.postId.$in.includes(row.postId)) {
                grouped.set(row.postId, (grouped.get(row.postId) || 0) + 1);
            }
        }
        return [...grouped].map(([_id, count]) => ({ _id, count }));
    };

    const res = response();
    await getPosts({ query: {}, user: { _id: "viewer", friend: [], blockList: [], savedPosts: [] } }, res);
    return { res, aggregateCalls, pipeline };
}

test("post commentsCount includes active comments and excludes deleted comments", async (t) => {
    const { res, aggregateCalls, pipeline } = await readPostsWithComments(t, [
        { postId: "post-1", status: "active" },
        { postId: "post-1", status: "active" },
        { postId: "post-1", status: "deleted" },
    ]);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.posts[0].commentsCount, 2);
    assert.equal(aggregateCalls, 1);
    assert.equal(pipeline[0].$match.status, "active");
    assert.deepEqual(pipeline[1].$group, { _id: "$postId", count: { $sum: 1 } });
});

test("post commentsCount is zero when there are no comments", async (t) => {
    const { res, aggregateCalls } = await readPostsWithComments(t, []);
    assert.equal(res.body.posts[0].commentsCount, 0);
    assert.equal(aggregateCalls, 1);
});
