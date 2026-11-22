const test = require("node:test");
const assert = require("node:assert/strict");
const Post = require("../models/Post");
const Comment = require("../models/Comment");
const User = require("../models/User");
const { deletePost } = require("../controllers/postControllers");
const { deleteComment } = require("../controllers/commentControllers");

function response() {
    return {
        statusCode: 200,
        body: null,
        status(code) { this.statusCode = code; return this; },
        json(body) { this.body = body; return this; },
    };
}

test("post owner and admin can soft-delete; deleted posts are not physically removed", async () => {
    const originalFindOne = Post.findOne;
    const originalUpdateMany = Post.updateMany;
    const deletedPost = { authorId: "owner", status: "active", save: async function () {} };
    Post.findOne = async () => deletedPost;
    Post.updateMany = async () => ({ modifiedCount: 0 });

    try {
        const res = response();
        await deletePost({ params: { id: "p1" }, user: { _id: "admin", isAdmin: true } }, res);
        assert.equal(res.statusCode, 200);
        assert.equal(deletedPost.status, "deleted");
    } finally {
        Post.findOne = originalFindOne;
        Post.updateMany = originalUpdateMany;
    }
});

test("comment author, post owner and admin can soft-delete; others cannot", async () => {
    const originalCommentFind = Comment.findOne;
    const originalPostFind = Post.findOne;
    const originalUserFind = User.findById;
    const comment = { authorId: "author", postId: "p1", status: "active", save: async function () {} };
    Comment.findOne = async () => comment;
    Post.findOne = async () => ({ _id: "p1", authorId: "post-owner", privacy: "public", status: "active" });
    User.findById = () => ({ select: async () => ({ _id: "post-owner", blockList: [] }) });

    try {
        const denied = response();
        await deleteComment({ params: { id: "c1" }, user: { _id: "stranger", isAdmin: false } }, denied);
        assert.equal(denied.statusCode, 403);
        assert.equal(comment.status, "active");

        const allowed = response();
        await deleteComment({ params: { id: "c1" }, user: { _id: "post-owner", isAdmin: false } }, allowed);
        assert.equal(allowed.statusCode, 200);
        assert.equal(comment.status, "deleted");
    } finally {
        Comment.findOne = originalCommentFind;
        Post.findOne = originalPostFind;
        User.findById = originalUserFind;
    }
});
