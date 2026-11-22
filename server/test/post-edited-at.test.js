const test = require("node:test");
const assert = require("node:assert/strict");
const Post = require("../models/Post");
const User = require("../models/User");
const { updatePost } = require("../controllers/postControllers");
const { reactToPost } = require("../controllers/reactionControllers");

function response() {
    return { statusCode: 200, body: null, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
}

function request(body = {}) {
    return { body, protocol: "http", headers: { host: "localhost:5000" }, get(name) { return this.headers[name.toLowerCase()]; }, params: { id: "post-id" }, user: { _id: "user-id", friend: [], blockList: [] }, method: "PUT" };
}

test("updatePost sets editedAt when content changes", async () => {
    const originalFindOne = Post.findOne;
    const post = { authorId: "user-id", content: "before", image: "", video: "", save: async () => {} };
    Post.findOne = async () => post;
    try {
        await updatePost(request({ content: "after" }), response());
        assert.ok(post.editedAt instanceof Date);
    } finally { Post.findOne = originalFindOne; }
});

test("same content and a reaction leave editedAt null", async () => {
    const originalFindOne = Post.findOne;
    const originalFindById = User.findById;
    const post = { _id: "post-id", authorId: "user-id", content: "same", image: "", video: "", privacy: "public", reactions: [], likes: [], editedAt: null, save: async () => {} };
    Post.findOne = async () => post;
    User.findById = () => ({ select: async () => ({ _id: "user-id", blockList: [] }) });
    try {
        await updatePost(request({ content: " same " }), response());
        assert.equal(post.editedAt, null);
        await reactToPost(request({ type: "like" }), response());
        assert.equal(post.editedAt, null);
    } finally {
        Post.findOne = originalFindOne;
        User.findById = originalFindById;
    }
});
