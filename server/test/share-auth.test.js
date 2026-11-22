const test = require("node:test");
const assert = require("node:assert/strict");
const bcrypt = require("bcryptjs");
const Post = require("../models/Post");
const User = require("../models/User");
const Notification = require("../models/Notification");
const { sharePost } = require("../controllers/postControllers");
const { register, login, changePassword } = require("../controllers/authControllers");

function response() {
    return {
        statusCode: 200,
        body: null,
        status(code) { this.statusCode = code; return this; },
        json(body) { this.body = body; return this; },
    };
}

test("share creates a captioned root reference and notifies the root author", async () => {
    const originalFind = Post.findOne;
    const originalCreate = Post.create;
    const originalUserFind = User.findById;
    const originalNotificationCreate = Notification.create;
    Post.findOne = async ({ _id }) => _id === "source" ? ({ _id: "source", authorId: "author", content: "Public content", image: "", video: "", privacy: "public", originalPostId: null }) : null;
    Post.create = async (data) => ({ _id: "share1", ...data });
    User.findById = () => ({ select: async () => ({ _id: "author", blockList: [] }) });
    let notification;
    Notification.create = async (data) => { notification = data; };
    try {
        const res = response();
        await sharePost({ params: { id: "source" }, body: { caption: "  My caption  " }, user: { _id: "sharer", blockList: [] } }, res);
        assert.equal(res.statusCode, 201);
        assert.equal(res.body.post.originalPostId, "source");
        assert.equal(res.body.post.content, "My caption");
        assert.equal(notification.type, "share");
        assert.equal(notification.recipientId, "author");
    } finally {
        Post.findOne = originalFind;
        Post.create = originalCreate;
        User.findById = originalUserFind;
        Notification.create = originalNotificationCreate;
    }
});

test("share without a caption stores an empty string", async () => {
    const originalFind = Post.findOne, originalCreate = Post.create, originalUserFind = User.findById, originalNotificationCreate = Notification.create;
    Post.findOne = async () => ({ _id: "root", authorId: "author", content: "Root", image: "", video: "", privacy: "public", originalPostId: null });
    Post.create = async (data) => data;
    User.findById = () => ({ select: async () => ({ _id: "author", blockList: [] }) });
    Notification.create = async () => {};
    try {
        const res = response();
        await sharePost({ params: { id: "root" }, body: {}, user: { _id: "sharer", blockList: [] } }, res);
        assert.equal(res.statusCode, 201);
        assert.equal(res.body.post.content, "");
    } finally { Post.findOne = originalFind; Post.create = originalCreate; User.findById = originalUserFind; Notification.create = originalNotificationCreate; }
});

test("share rejects captions over 500 characters", async () => {
    const res = response();
    await sharePost({ params: { id: "root" }, body: { caption: "x".repeat(501) }, user: { _id: "sharer", blockList: [] } }, res);
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.message, "Chú thích không hợp lệ.");
});

test("share rejects a caption with the wrong type", async () => {
    const res = response();
    await sharePost({ params: { id: "root" }, body: { caption: 12 }, user: { _id: "sharer", blockList: [] } }, res);
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.message, "Chú thích không hợp lệ.");
});

test("share resolves a share to its active root post", async () => {
    const originalFind = Post.findOne, originalCreate = Post.create, originalUserFind = User.findById, originalNotificationCreate = Notification.create;
    Post.findOne = async ({ _id }) => _id === "share" ? { _id, authorId: "intermediate", originalPostId: "root" } : _id === "root" ? { _id, authorId: "root-author", content: "Root", image: "root.jpg", video: "", privacy: "public", originalPostId: null } : null;
    Post.create = async (data) => data;
    User.findById = () => ({ select: async () => ({ _id: "root-author", blockList: [] }) });
    let notification;
    Notification.create = async (data) => { notification = data; };
    try {
        const res = response();
        await sharePost({ params: { id: "share" }, body: { caption: "caption" }, user: { _id: "sharer", blockList: [] } }, res);
        assert.equal(res.statusCode, 201);
        assert.equal(res.body.post.originalPostId, "root");
        assert.equal(res.body.post.image, "root.jpg");
        assert.equal(notification.recipientId, "root-author");
    } finally { Post.findOne = originalFind; Post.create = originalCreate; User.findById = originalUserFind; Notification.create = originalNotificationCreate; }
});

test("share returns 404 when its root is unavailable", async () => {
    const originalFind = Post.findOne;
    Post.findOne = async ({ _id }) => _id === "share" ? { _id, originalPostId: "deleted-root" } : null;
    try {
        const res = response();
        await sharePost({ params: { id: "share" }, body: {}, user: { _id: "sharer", blockList: [] } }, res);
        assert.equal(res.statusCode, 404);
        assert.equal(res.body.message, "Bài viết gốc không còn khả dụng.");
    } finally { Post.findOne = originalFind; }
});

test("registration requires a matching confirmation and strong password", async () => {
    const res = response();
    await register({ body: {
        username: "user", email: "user@example.com", password: "weak", confirmPassword: "different",
    } }, res);
    assert.equal(res.statusCode, 400);
});

test("login uses the same unauthorized status for unknown email", async () => {
    const originalFind = User.findOne;
    User.findOne = async () => null;
    try {
        const res = response();
        await login({ body: { email: "missing@example.com", password: "whatever" } }, res);
        assert.equal(res.statusCode, 401);
    } finally {
        User.findOne = originalFind;
    }
});

test("change password checks the current password and stores a new hash", async () => {
    const originalFind = User.findById;
    process.env.JWT_SECRET = "share-auth-test-secret";
    const user = {
        _id: "user",
        password: await bcrypt.hash("CurrentPass1", 4),
        tokenVersion: 0,
        isAdmin: false,
        resetPasswordToken: "old-token",
        resetPasswordExpires: new Date(),
        save: async () => {},
    };
    User.findById = async () => user;
    try {
        const denied = response();
        await changePassword({ body: {
            currentPassword: "incorrect", newPassword: "NewPassword2", confirmPassword: "NewPassword2",
        }, user: { _id: "user" } }, denied);
        assert.equal(denied.statusCode, 401);

        const allowed = response();
        await changePassword({ body: {
            currentPassword: "CurrentPass1", newPassword: "NewPassword2", confirmPassword: "NewPassword2",
        }, user: { _id: "user" } }, allowed);
        assert.equal(allowed.statusCode, 200);
        assert.equal(await bcrypt.compare("NewPassword2", user.password), true);
        assert.equal(user.resetPasswordToken, null);
    } finally {
        User.findById = originalFind;
    }
});
