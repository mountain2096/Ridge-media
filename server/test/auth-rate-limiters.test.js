const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const { createRateLimiters } = require("../middleware/rateLimiters");

const rateLimitMessage = "Bạn thao tác quá nhiều lần, vui lòng thử lại sau.";

async function withEndpoint(limiter, handlerStatus, run) {
    const app = express();
    app.post("/", limiter, (req, res) => {
        const status = req.query.status ? Number(req.query.status) : handlerStatus;
        res.status(status).json({ ok: true });
    });
    const server = app.listen(0, "127.0.0.1");
    await new Promise((resolve, reject) => {
        server.once("listening", resolve);
        server.once("error", reject);
    });

    try {
        const url = `http://127.0.0.1:${server.address().port}/`;
        await run(async (status) => fetch(`${url}${status ? `?status=${status}` : ""}`, { method: "POST" }));
    } finally {
        server.closeAllConnections();
        await new Promise((resolve) => server.close(resolve));
    }
}

for (const [name, limiterName] of [
    ["register", "register"],
    ["forgot-password", "forgotPassword"],
    ["reset-password", "resetPassword"],
]) {
    test(`${name} allows requests under its test limit and returns JSON 429 for the next request`, async () => {
        const limiters = createRateLimiters({ [limiterName]: { limit: 2, windowMs: 60_000 } });
        await withEndpoint(limiters[limiterName], 200, async (request) => {
            const first = await request();
            const second = await request();
            const overLimit = await request();

            assert.equal(first.status, 200);
            assert.equal(second.status, 200);
            assert.equal(overLimit.status, 429);
            assert.match(overLimit.headers.get("content-type"), /application\/json/);
            assert.deepEqual(await overLimit.json(), { message: rateLimitMessage });
            assert.ok(overLimit.headers.has("ratelimit-limit"));
            assert.equal(overLimit.headers.has("x-ratelimit-limit"), false);
        });
    });
}

test("login does not count successful requests, but rate limits failed attempts", async () => {
    const limiters = createRateLimiters({ login: { limit: 1, windowMs: 60_000 } });
    await withEndpoint(limiters.login, 200, async (request) => {
        const successfulLogin = await request();
        assert.equal(successfulLogin.status, 200);

        const firstFailedLogin = await request(401);
        const secondFailedLogin = await request(401);
        assert.equal(firstFailedLogin.status, 401);
        assert.equal(secondFailedLogin.status, 429);
        assert.deepEqual(await secondFailedLogin.json(), { message: rateLimitMessage });
    });
});
