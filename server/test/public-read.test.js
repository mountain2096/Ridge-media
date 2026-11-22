const test = require("node:test");
const assert = require("node:assert/strict");
const Post = require("../models/Post");
const User = require("../models/User");
const Comment = require("../models/Comment");
const { getPublicUser, getPublicUserPosts } = require("../controllers/publicControllers");

function response() {
    return { statusCode: 200, body: null, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
}

function query(value) {
    return { select() { return this; }, then(resolve, reject) { return Promise.resolve(value).then(resolve, reject); } };
}

function postQuery(posts) {
    return {
        populate() { return this; }, sort() { return this; }, skip() { return this; }, limit() { return this; },
        then(resolve, reject) { return Promise.resolve(posts).then(resolve, reject); },
    };
}

const id = "0123456789abcdef01234567";

test("public profile returns only approved fields and friend count", async () => {
    const original = User.findById;
    User.findById = () => query({ _id: id, username: "guest", profilePicture: "p", coverPicture: "c", bio: "b", createdAt: "date", friend: [1, 2], email: "secret", isAdmin: true });
    try {
        const res = response();
        await getPublicUser({ params: { id } }, res);
        assert.deepEqual(res.body.user, { _id: id, username: "guest", profilePicture: "p", coverPicture: "c", bio: "b", createdAt: "date", friendCount: 2 });
    } finally { User.findById = original; }
});

test("public profile hides locked or missing users and rejects invalid ids", async () => {
    const original = User.findById;
    try {
        for (const user of [null, { isLocked: true }]) {
            User.findById = () => query(user);
            const res = response();
            await getPublicUser({ params: { id } }, res);
            assert.equal(res.statusCode, 404);
        }
        const invalid = response();
        await getPublicUser({ params: { id: "bad" } }, invalid);
        assert.equal(invalid.statusCode, 400);
    } finally { User.findById = original; }
});

test("guest user posts use public visibility and redact reaction identities", async () => {
    const originals = [Post.find, Post.countDocuments, User.distinct, Comment.aggregate, User.findById];
    let filter;
    const post = {
        _id: id, authorId: { username: "author" }, originalPostId: id, likes: ["legacy"],
        reactions: [{ userId: "person", reaction: "love" }], content: "body", image: "image", video: "video",
        toObject() { return { ...this }; }, populated() { return id; },
    };
    Post.find = (value) => { filter = value; return postQuery([post]); };
    Post.countDocuments = async () => 1;
    User.distinct = async () => ["locked"];
    Comment.aggregate = async () => [];
    User.findById = () => query({ _id: id, isLocked: false });
    try {
        const res = response();
        await getPublicUserPosts({ params: { id }, query: {} }, res);
        assert.equal(res.statusCode, 200);
        assert.equal(filter.privacy, "public");
        assert.equal(filter.status, "active");
        assert.deepEqual(filter.authorId.$nin, ["locked"]);
        assert.equal(filter.authorId.$eq, id);
        assert.equal(res.body.posts[0].likes, undefined);
        assert.equal(res.body.posts[0].reactions, undefined);
        assert.deepEqual(res.body.posts[0].reactionCounts, { like: 1, love: 1, haha: 0, wow: 0, sad: 0, angry: 0 });
        assert.equal(res.body.posts[0].reactionTotal, 2);
        assert.equal(res.body.posts[0].isLiked, false);
        assert.equal(res.body.posts[0].originalUnavailable, false);
    } finally {
        [Post.find, Post.countDocuments, User.distinct, Comment.aggregate, User.findById] = originals;
    }
});

test("guest user posts blank unavailable shared content and validate pagination", async () => {
    const originals = [Post.find, Post.countDocuments, User.distinct, Comment.aggregate, User.findById];
    const post = { _id: id, authorId: {}, originalPostId: null, content: "body", image: "image", video: "video", toObject() { return { ...this }; }, populated() { return id; } };
    Post.find = () => postQuery([post]); Post.countDocuments = async () => 1; User.distinct = async () => []; Comment.aggregate = async () => [];
    User.findById = () => query({ _id: id, isLocked: false });
    try {
        const res = response(); await getPublicUserPosts({ params: { id }, query: {} }, res);
        assert.equal(res.body.posts[0].originalUnavailable, true);
        assert.equal(res.body.posts[0].content, ""); assert.equal(res.body.posts[0].image, ""); assert.equal(res.body.posts[0].video, "");
        for (const queryParams of [{ page: "0" }, { limit: "51" }]) {
            const invalidUserPosts = response(); await getPublicUserPosts({ params: { id }, query: queryParams }, invalidUserPosts); assert.equal(invalidUserPosts.statusCode, 400);
        }
    } finally { [Post.find, Post.countDocuments, User.distinct, Comment.aggregate, User.findById] = originals; }
});

test("public router exposes only profile and profile-post routes", () => {
    const routes = require("../routes/public").stack.filter((layer) => layer.route).map((layer) => `${Object.keys(layer.route.methods).join(",").toUpperCase()} ${layer.route.path}`);
    assert.deepEqual(routes, ["GET /users/:id", "GET /users/:id/posts"]);
});

test("public routes apply publicRead without protect; existing user, post, and story routes stay protected", () => {
    const publicRouter = require("../routes/public");
    const protect = require("../middlewares/protect");
    const publicRead = require("../middleware/rateLimiters").publicRead;
    assert.equal(publicRouter.stack.some((layer) => layer.route.stack.some((item) => item.handle === protect)), false);
    assert.ok(publicRouter.stack.every((layer) => layer.route.stack.some((item) => item.handle === publicRead)));
    for (const router of ["user", "post", "story"].map((name) => require(`../routes/${name}`))) {
        assert.ok(router.stack.filter((layer) => layer.route).every((layer) => layer.route.stack.some((item) => item.handle === protect)));
    }
    assert.ok(require("../middleware/rateLimiters").createRateLimiters().publicRead);
});
