const test = require("node:test");
const assert = require("node:assert/strict");
const Post = require("../models/Post");
const User = require("../models/User");
const { createPost, updatePost } = require("../controllers/postControllers");
const { updateMe } = require("../controllers/userControllers");

const validMediaUrl = "http://localhost:5000/uploads/123e4567-e89b-42d3-a456-426614174000.jpg";
const validRelativeMediaUrl = "/uploads/123e4567-e89b-42d3-a456-426614174000.jpg";
const invalidMediaUrls = [
    "javascript:alert(1)",
    "data:image/png;base64,AAAA",
    "/uploads/../secret.jpg", "/uploads/file.svg",
];

function request(body) {
    return {
        body,
        protocol: "http",
        headers: { host: "localhost:5000" },
        get(name) {
            return this.headers[name.toLowerCase()];
        },
        params: { id: "post-id" },
        user: { _id: "user-id" },
    };
}

function response() {
    return {
        statusCode: 200,
        body: null,
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(body) {
            this.body = body;
            return this;
        },
    };
}

async function assertRejectedBy(handler, body, expectedMessage) {
    const res = response();
    await handler(request(body), res);
    assert.equal(res.statusCode, 400);
    assert.match(res.body.message, expectedMessage);
}

test("createPost accepts an upload URL and rejects unsafe or external media URLs", async () => {
    const originalCreate = Post.create;
    Post.create = async (data) => ({ _id: "new-post", ...data });
    try {
        const accepted = response();
        await createPost(request({ content: "hello", image: validMediaUrl }), accepted);
        assert.equal(accepted.statusCode, 201);
        const oldHost = response();
        await createPost(request({ content: "hello", image: "https://previous-tunnel.example/uploads/123e4567-e89b-42d3-a456-426614174000.jpg" }), oldHost);
        assert.equal(oldHost.statusCode, 201);
        const relative = response();
        await createPost(request({ content: "hello", image: validRelativeMediaUrl }), relative);
        assert.equal(relative.statusCode, 201);

        for (const mediaUrl of invalidMediaUrls) {
            await assertRejectedBy(
                createPost,
                { content: "hello", image: mediaUrl },
                /Media.*URL/,
            );
        }

        const emptyMedia = response();
        await createPost(request({ content: "hello", image: "", video: "" }), emptyMedia);
        assert.equal(emptyMedia.statusCode, 201);
    } finally {
        Post.create = originalCreate;
    }
});

test("updatePost accepts an upload URL and rejects unsafe or external media URLs", async () => {
    const originalFindOne = Post.findOne;
    const post = {
        authorId: "user-id",
        save: async () => {},
    };
    Post.findOne = async () => post;
    try {
        const accepted = response();
        await updatePost(request({ image: validMediaUrl }), accepted);
        assert.equal(accepted.statusCode, 200);

        for (const mediaUrl of invalidMediaUrls) {
            await assertRejectedBy(updatePost, { video: mediaUrl }, /Media.*URL/);
        }

        const cleared = response();
        await updatePost(request({ image: "", video: "" }), cleared);
        assert.equal(cleared.statusCode, 200);
    } finally {
        Post.findOne = originalFindOne;
    }
});

test("updateMe accepts upload URLs and rejects unsafe or external avatar and cover URLs", async () => {
    const originalFindById = User.findById;
    const user = {
        _id: "user-id",
        save: async () => {},
    };
    User.findById = async () => user;
    try {
        const accepted = response();
        await updateMe(request({ profilePicture: validMediaUrl, coverPicture: validMediaUrl }), accepted);
        assert.equal(accepted.statusCode, 200);

        for (const mediaUrl of invalidMediaUrls) {
            await assertRejectedBy(updateMe, { profilePicture: mediaUrl }, /Ảnh đại diện.*URL/);
            await assertRejectedBy(updateMe, { coverPicture: mediaUrl }, /Ảnh bìa.*URL/);
        }

        const cleared = response();
        await updateMe(request({ profilePicture: "", coverPicture: "" }), cleared);
        assert.equal(cleared.statusCode, 200);
    } finally {
        User.findById = originalFindById;
    }
});
