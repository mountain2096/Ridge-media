const test = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const protect = require("../middlewares/protect");
const requireAdmin = require("../middlewares/requireAdmin");

function response() {
    return {
        statusCode: 200,
        body: null,
        status(code) { this.statusCode = code; return this; },
        json(body) { this.body = body; return this; },
    };
}

test("protect rejects locked accounts", async () => {
    const originalFindById = User.findById;
    process.env.JWT_SECRET = "middleware-test-secret";
    User.findById = () => ({ select: async () => ({ _id: "u1", isLocked: true }) });

    try {
        const res = response();
        let continued = false;
        await protect({ headers: { authorization: `Bearer ${jwt.sign({ id: "u1" }, process.env.JWT_SECRET)}` } }, res, () => { continued = true; });
        assert.equal(res.statusCode, 403);
        assert.equal(continued, false);
    } finally {
        User.findById = originalFindById;
    }
});

test("requireAdmin rejects non-admin and allows admin", () => {
    const denied = response();
    let continued = false;
    requireAdmin({ user: { isAdmin: false } }, denied, () => { continued = true; });
    assert.equal(denied.statusCode, 403);
    assert.equal(continued, false);

    const allowed = response();
    requireAdmin({ user: { isAdmin: true } }, allowed, () => { continued = true; });
    assert.equal(continued, true);
});
