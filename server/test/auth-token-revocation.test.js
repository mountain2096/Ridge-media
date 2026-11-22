const test = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const protect = require("../middlewares/protect");
const { login, logout, changePassword } = require("../controllers/authControllers");
const { authenticateSocket } = require("../socket");

const SECRET = "token-revocation-test-secret";
const USER_ID = "64b000000000000000000001";

function response() {
    return {
        statusCode: 200,
        body: null,
        status(code) { this.statusCode = code; return this; },
        json(body) { this.body = body; return this; },
    };
}

test("protect accepts matching versions and legacy tokens at version zero", async () => {
    const originalFindById = User.findById;
    process.env.JWT_SECRET = SECRET;
    let version;
    User.findById = () => ({ select: async () => ({ _id: USER_ID, tokenVersion: version }) });

    try {
        for (const [userVersion, tokenVersion] of [[2, 2], [0, undefined], [undefined, undefined]]) {
            version = userVersion;
            const token = jwt.sign({ id: USER_ID, ...(tokenVersion === undefined ? {} : { tv: tokenVersion }) }, SECRET);
            let continued = false;
            await protect({ headers: { authorization: `Bearer ${token}` } }, response(), () => { continued = true; });
            assert.equal(continued, true);
        }
    } finally {
        User.findById = originalFindById;
    }
});

test("protect rejects an older token version", async () => {
    const originalFindById = User.findById;
    process.env.JWT_SECRET = SECRET;
    User.findById = () => ({ select: async () => ({ _id: USER_ID, tokenVersion: 3 }) });

    try {
        const res = response();
        let continued = false;
        await protect({ headers: { authorization: `Bearer ${jwt.sign({ id: USER_ID, tv: 2 }, SECRET)}` } }, res, () => { continued = true; });
        assert.equal(res.statusCode, 401);
        assert.equal(continued, false);
    } finally {
        User.findById = originalFindById;
    }
});

test("logout increments tokenVersion and reports update failures", async () => {
    const originalUpdateOne = User.updateOne;
    let args;
    User.updateOne = async (...values) => { args = values; };
    const originalConsoleError = console.error;
    try {
        const res = response();
        await logout({ user: { _id: USER_ID } }, res);
        assert.deepEqual(args, [{ _id: USER_ID }, { $inc: { tokenVersion: 1 } }]);
        assert.equal(res.statusCode, 200);

        User.updateOne = async () => { throw new Error("database error"); };
        console.error = () => {};
        const failed = response();
        await logout({ user: { _id: USER_ID } }, failed);
        assert.equal(failed.statusCode, 500);
        assert.ok(failed.body.message);
    } finally {
        User.updateOne = originalUpdateOne;
        console.error = originalConsoleError;
    }
});

test("socket authentication accepts current tokens and rejects stale versions", async () => {
    const originalFindById = User.findById;
    process.env.JWT_SECRET = SECRET;
    User.findById = () => ({ select: async () => ({ _id: USER_ID, tokenVersion: 4 }) });

    try {
        const run = async (tv) => {
            const socket = { handshake: { auth: { token: jwt.sign({ id: USER_ID, tv }, SECRET) } }, data: {} };
            let error = null;
            await authenticateSocket(socket, (value) => { error = value || null; });
            return { socket, error };
        };
        assert.equal((await run(3)).error?.message, "UNAUTHORIZED");
        const accepted = await run(4);
        assert.equal(accepted.error, null);
        assert.equal(accepted.socket.data.userId, USER_ID);
    } finally {
        User.findById = originalFindById;
    }
});

test("login signs the user's tokenVersion", async () => {
    const originalFindOne = User.findOne;
    const originalCompare = bcrypt.compare;
    process.env.JWT_SECRET = SECRET;
    User.findOne = async () => ({ _id: USER_ID, email: "user@example.com", username: "user", password: "hash", tokenVersion: 7 });
    bcrypt.compare = async () => true;

    try {
        const res = response();
        await login({ body: { email: "user@example.com", password: "password" } }, res);
        assert.equal(jwt.verify(res.body.token, SECRET).tv, 7);
    } finally {
        User.findOne = originalFindOne;
        bcrypt.compare = originalCompare;
    }
});

test("changing password revokes old tokens and returns a current token", async () => {
    const originalFindById = User.findById;
    const originalCompare = bcrypt.compare;
    const originalHash = bcrypt.hash;
    process.env.JWT_SECRET = SECRET;
    const user = {
        _id: USER_ID, password: "old-hash", tokenVersion: 2, isAdmin: true,
        select: async () => user,
        save: async () => {},
    };
    User.findById = (id) => id === USER_ID ? user : null;
    bcrypt.compare = async (password, hash) => password === "CurrentPass1" && hash === "old-hash";
    bcrypt.hash = async () => "new-hash";

    try {
        const denied = response();
        await changePassword({ body: {
            currentPassword: "wrong", newPassword: "NewPassword2", confirmPassword: "NewPassword2",
        }, user: { _id: USER_ID } }, denied);
        assert.equal(denied.statusCode, 401);
        assert.equal(user.tokenVersion, 2);
        assert.equal("token" in denied.body, false);

        const res = response();
        await changePassword({ body: {
            currentPassword: "CurrentPass1", newPassword: "NewPassword2", confirmPassword: "NewPassword2",
        }, user: { _id: USER_ID } }, res);
        assert.equal(res.statusCode, 200);
        assert.equal(user.tokenVersion, 3);
        const claims = jwt.verify(res.body.token, SECRET);
        assert.equal(claims.id, USER_ID);
        assert.equal(claims.tv, 3);
        assert.equal(claims.isAdmin, true);

        for (const [token, expectedStatus] of [
            [jwt.sign({ id: USER_ID, tv: 2 }, SECRET), 401],
            [res.body.token, 200],
        ]) {
            const checked = response();
            let continued = false;
            await protect({ headers: { authorization: `Bearer ${token}` } }, checked, () => { continued = true; });
            assert.equal(checked.statusCode, expectedStatus);
            assert.equal(continued, expectedStatus === 200);
        }
    } finally {
        User.findById = originalFindById;
        bcrypt.compare = originalCompare;
        bcrypt.hash = originalHash;
    }
});
