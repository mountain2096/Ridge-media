const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const fs = require("node:fs/promises");
const path = require("node:path");
const jwt = require("jsonwebtoken");
const app = require("../server");
const User = require("../models/User");
const uploadRoutes = require("../routes/upload");
const validateMediaUrl = require("../utils/validateMediaUrl");

test("upload URLs and media validation honor forwarded HTTPS and local HTTP", async () => {
    const originalFindById = User.findById;
    const originalSecret = process.env.JWT_SECRET;
    process.env.JWT_SECRET = "proxy-media-test-secret";
    User.findById = () => ({ select: async () => ({ _id: "test-user", tokenVersion: 0 }) });

    const testApp = express();
    testApp.set("trust proxy", app.get("trust proxy"));
    testApp.use(express.json());
    testApp.use("/api/upload", uploadRoutes);
    testApp.post("/validate", (req, res) => {
        res.json({ protocol: req.protocol, valid: validateMediaUrl(req.body.url, req) });
    });
    const server = testApp.listen(0, "127.0.0.1");
    await new Promise((resolve, reject) => {
        server.once("listening", resolve);
        server.once("error", reject);
    });

    const createdFiles = [];
    try {
        assert.equal(testApp.get("trust proxy"), 1);
        const baseUrl = `http://127.0.0.1:${server.address().port}`;
        const token = jwt.sign({ id: "test-user" }, process.env.JWT_SECRET);
        for (const [forwardedProto, expectedProtocol] of [["https", "https"], [undefined, "http"]]) {
            const form = new FormData();
            form.append("file", new Blob(["image"], { type: "image/png" }), "test.png");
            const headers = { Authorization: `Bearer ${token}`, Host: "ridge.example" };
            if (forwardedProto) headers["X-Forwarded-Proto"] = forwardedProto;
            const uploadResponse = await fetch(`${baseUrl}/api/upload`, { method: "POST", headers, body: form });
            assert.equal(uploadResponse.status, 201);
            const { url } = await uploadResponse.json();
            assert.match(url, /^\/uploads\/[A-Za-z0-9._-]+\.png$/);
            createdFiles.push(path.join(__dirname, "..", "uploads", path.basename(url)));

            const validationResponse = await fetch(`${baseUrl}/validate`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Host: "ridge.example", ...(forwardedProto ? { "X-Forwarded-Proto": forwardedProto } : {}) },
                body: JSON.stringify({ url }),
            });
            assert.deepEqual(await validationResponse.json(), { protocol: expectedProtocol, valid: true });
        }
    } finally {
        server.closeAllConnections();
        await new Promise((resolve) => server.close(resolve));
        await Promise.all(createdFiles.map((file) => fs.unlink(file).catch(() => {})));
        User.findById = originalFindById;
        if (originalSecret === undefined) delete process.env.JWT_SECRET;
        else process.env.JWT_SECRET = originalSecret;
    }
});
