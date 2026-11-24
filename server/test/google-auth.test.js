const test = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { createGoogleAuthController } = require("../controllers/authControllers");

const SECRET = "google-auth-test-secret";
const payload = { email: "person@example.com", email_verified: true, name: "Google Person", picture: "https://images.example/avatar.png" };

function response() {
    return { statusCode: 200, body: null, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
}

async function invoke({ claims = payload, verify, findOne = async () => null, create = async (user) => ({ ...user, _id: "user-1", tokenVersion: 4 }) } = {}) {
    const oldFindOne = User.findOne;
    const oldCreate = User.create;
    const oldClientId = process.env.GOOGLE_CLIENT_ID;
    const oldSecret = process.env.JWT_SECRET;
    User.findOne = findOne;
    User.create = create;
    process.env.GOOGLE_CLIENT_ID = "test-client-id";
    process.env.JWT_SECRET = SECRET;
    try {
        const res = response();
        await createGoogleAuthController(verify || (async () => ({ getPayload: () => claims })))({ body: { credential: "mock-credential" } }, res);
        return res;
    } finally {
        User.findOne = oldFindOne;
        User.create = oldCreate;
        if (oldClientId === undefined) delete process.env.GOOGLE_CLIENT_ID; else process.env.GOOGLE_CLIENT_ID = oldClientId;
        if (oldSecret === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = oldSecret;
    }
}

test("Google sign-in creates a user and returns the login response shape with tokenVersion", async () => {
    let created;
    const res = await invoke({ create: async (user) => (created = { ...user, _id: "user-1", tokenVersion: 4 }) });
    assert.equal(res.statusCode, 200);
    assert.equal(created.email, "person@example.com");
    assert.equal(created.username, "Google Person");
    assert.match(created.password, /^\$2/);
    assert.equal(created.profilePicture, payload.picture);
    assert.deepEqual(Object.keys(res.body).sort(), ["message", "token", "user"].sort());
    assert.deepEqual(Object.keys(res.body.user).sort(), ["id", "email", "username"].sort());
    assert.equal(jwt.verify(res.body.token, SECRET).tv, 4);
});

test("Google sign-in reuses an existing account without creating a duplicate", async () => {
    const user = { _id: "existing", email: payload.email, username: "Existing", tokenVersion: 0 };
    let creates = 0;
    const res = await invoke({ findOne: async ({ email }) => email ? user : null, create: async () => { creates++; } });
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.user.id, "existing");
    assert.equal(creates, 0);
});

test("Google sign-in rejects locked users", async () => {
    const res = await invoke({ findOne: async ({ email }) => email ? { isLocked: true } : null });
    assert.equal(res.statusCode, 403);
    assert.match(res.body.message, /vô hiệu hóa/i);
});

test("Google sign-in rejects unverified email", async () => {
    const res = await invoke({ claims: { ...payload, email_verified: false } });
    assert.equal(res.statusCode, 401);
});

test("Google sign-in rejects invalid credentials", async () => {
    const res = await invoke({ verify: async () => { throw new Error("invalid token"); } });
    assert.equal(res.statusCode, 401);
});

test("Google sign-in reports missing server configuration", async () => {
    const oldClientId = process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_ID;
    try {
        const res = response();
        await createGoogleAuthController(async () => { throw new Error("should not verify"); })({ body: { credential: "x" } }, res);
        assert.equal(res.statusCode, 503);
    } finally {
        if (oldClientId === undefined) delete process.env.GOOGLE_CLIENT_ID; else process.env.GOOGLE_CLIENT_ID = oldClientId;
    }
});

test("Google sign-in appends a random suffix when the username is taken", async () => {
    const calls = [];
    let created;
    const res = await invoke({
        findOne: async (query) => {
            if (query.email) return null;
            calls.push(query.username);
            return calls.length === 1 ? { username: query.username } : null;
        },
        create: async (user) => (created = { ...user, _id: "user-2", tokenVersion: 0 }),
    });
    assert.equal(res.statusCode, 200);
    assert.match(created.username, /^Google Person-[a-f0-9]{6}$/);
    assert.equal(calls.length, 2);
});
