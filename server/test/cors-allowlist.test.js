const test = require("node:test");
const assert = require("node:assert/strict");
const app = require("../server.js");

let server;
let baseUrl;

test.before(async () => {
    server = app.listen(0, "127.0.0.1");
    await new Promise((resolve, reject) => {
        server.once("listening", resolve);
        server.once("error", reject);
    });
    baseUrl = `http://127.0.0.1:${server.address().port}/`;
});

test.after(async () => {
    if (!server) return;
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
});

async function withCorsEnvironment({ clientUrl, nodeEnv }, run) {
    const previousClientUrl = process.env.CLIENT_URL;
    const previousNodeEnv = process.env.NODE_ENV;
    if (clientUrl === undefined) delete process.env.CLIENT_URL;
    else process.env.CLIENT_URL = clientUrl;
    process.env.NODE_ENV = nodeEnv;

    try {
        await run();
    } finally {
        if (previousClientUrl === undefined) delete process.env.CLIENT_URL;
        else process.env.CLIENT_URL = previousClientUrl;
        if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
        else process.env.NODE_ENV = previousNodeEnv;
    }
}

async function requestWithOrigin(origin) {
    return fetch(baseUrl, { headers: origin ? { Origin: origin } : {} });
}

test("CORS allows the CLIENT_URL origin after trimming its trailing slash", async () => {
    await withCorsEnvironment({ clientUrl: "https://ridge.example/", nodeEnv: "production" }, async () => {
        const response = await requestWithOrigin("https://ridge.example");
        assert.equal(response.status, 200);
        assert.equal(response.headers.get("access-control-allow-origin"), "https://ridge.example");
    });
});

test("CORS rejects an origin outside CLIENT_URL", async () => {
    await withCorsEnvironment({ clientUrl: "https://ridge.example/", nodeEnv: "production" }, async () => {
        const response = await requestWithOrigin("https://untrusted.example");
        assert.equal(response.status, 200);
        assert.equal(response.headers.get("access-control-allow-origin"), null);
    });
});

test("development CORS allows localhost hosts on non-default ports", async () => {
    await withCorsEnvironment({ clientUrl: "https://ridge.example/", nodeEnv: "development" }, async () => {
        for (const origin of ["http://localhost:4789", "http://127.0.0.1:4789"]) {
            const response = await requestWithOrigin(origin);
            assert.equal(response.headers.get("access-control-allow-origin"), origin);
        }
    });
});

test("production CORS rejects localhost origins", async () => {
    await withCorsEnvironment({ clientUrl: "https://ridge.example/", nodeEnv: "production" }, async () => {
        const response = await requestWithOrigin("http://localhost:5173");
        assert.equal(response.status, 200);
        assert.equal(response.headers.get("access-control-allow-origin"), null);
    });
});

test("requests without an Origin header still work when production CLIENT_URL is unset", async () => {
    await withCorsEnvironment({ clientUrl: undefined, nodeEnv: "production" }, async () => {
        const response = await requestWithOrigin();
        assert.equal(response.status, 200);
    });
});
