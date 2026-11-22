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

test("share creates a reference post and a share notification for a public source", async () => {
    const originalFind = Post.findOne;
    const originalCreate = Post.create;
    const originalUserFind = User.findById;
    const originalNotificationCreate = Notification.create;
    Post.findOne = async () => ({ _id: "source", authorId: "author", content: "Public content", image: "", video: "", privacy: "public" });
    Post.create = async (data) => ({ _id: "share1", ...data });
    User.findById = () => ({ select: async () => ({ _id: "author", blockList: [] }) });
    let notification;
    Notification.create = async (data) => { notification = data; };
    try {
        const res = response();
        await sharePost({ params: { id: "source" }, user: { _id: "sharer", blockList: [] } }, res);
        assert.equal(res.statusCode, 201);
        assert.equal(res.body.post.originalPostId, "source");
        assert.equal(notification.type, "share");
        assert.equal(notification.recipientId, "author");
    } finally {
        Post.findOne = originalFind;
        Post.create = originalCreate;
        User.findById = originalUserFind;
        Notification.create = originalNotificationCreate;
    }
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
