const test = require("node:test");
const assert = require("node:assert/strict");
const Post = require("../models/Post");
const Comment = require("../models/Comment");
const User = require("../models/User");
const Report = require("../models/Report");
const Story = require("../models/Story");
const { deletePost } = require("../controllers/postControllers");
const { deleteComment } = require("../controllers/commentControllers");
const { deleteStory } = require("../controllers/storyControllers");

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
    const originalReportUpdateMany = Report.updateMany;
    const deletedPost = { authorId: "owner", status: "active", save: async function () {} };
    let reports;
    Post.findOne = async () => deletedPost;
    Post.updateMany = async () => ({ modifiedCount: 0 });
    Report.updateMany = async (filter, update) => { reports = { filter, update }; return { modifiedCount: 1 }; };

    try {
        const res = response();
        await deletePost({ params: { id: "p1" }, user: { _id: "admin", isAdmin: true } }, res);
        assert.equal(res.statusCode, 200);
        assert.equal(deletedPost.status, "deleted");
        assert.equal(reports.filter.status, "pending");
        assert.equal(reports.update.$set.status, "actioned");
    } finally {
        Post.findOne = originalFindOne;
        Post.updateMany = originalUpdateMany;
        Report.updateMany = originalReportUpdateMany;
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

test("admin can delete another user's comment and resolves its pending reports", async () => {
    const original = [Comment.findOne, Comment.updateMany, Post.findOne, User.findById, Report.updateMany];
    const comment = { _id: "c1", authorId: "author", postId: "p1", parentId: "parent", status: "active", save: async function () {} };
    let reportUpdate;
    Comment.findOne = async () => comment;
    Comment.updateMany = async () => ({ modifiedCount: 0 });
    Post.findOne = async () => ({ _id: "p1", authorId: "owner", privacy: "public", status: "active" });
    User.findById = () => ({ select: async () => ({ _id: "owner", blockList: [] }) });
    Report.updateMany = async (filter, update) => { reportUpdate = { filter, update }; return { modifiedCount: 1 }; };
    try {
        const res = response();
        await deleteComment({ params: { id: "c1" }, user: { _id: "admin", isAdmin: true } }, res);
        assert.equal(res.statusCode, 200);
        assert.equal(comment.status, "deleted");
        assert.equal(reportUpdate.filter.status, "pending");
        assert.equal(reportUpdate.update.$set.status, "actioned");
    } finally {
        [Comment.findOne, Comment.updateMany, Post.findOne, User.findById, Report.updateMany] = original;
    }
});

test("non-owner non-admin cannot delete a post or story", async () => {
    const original = [Post.findOne, Story.findById];
    Post.findOne = async () => ({ authorId: "owner", status: "active" });
    Story.findById = async () => ({ authorId: "owner" });
    try {
        const postRes = response();
        await deletePost({ params: { id: "p1" }, user: { _id: "stranger", isAdmin: false } }, postRes);
        assert.equal(postRes.statusCode, 403);
        const storyRes = response();
        await deleteStory({ params: { id: "s1" }, user: { _id: "stranger", isAdmin: false } }, storyRes);
        assert.equal(storyRes.statusCode, 403);
    } finally { [Post.findOne, Story.findById] = original; }
});

test("admin can delete another user's story", async () => {
    const original = Story.findById;
    let deleted = false;
    Story.findById = async () => ({ authorId: "owner", deleteOne: async () => { deleted = true; } });
    try {
        const res = response();
        await deleteStory({ params: { id: "s1" }, user: { _id: "admin", isAdmin: true } }, res);
        assert.equal(res.statusCode, 200);
        assert.equal(deleted, true);
    } finally { Story.findById = original; }
});
