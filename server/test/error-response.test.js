const test = require("node:test");
const assert = require("node:assert/strict");
const Notification = require("../models/Notification");
const { getNotification } = require("../controllers/notificationController");

test("unexpected controller errors return the generic message and do not expose error details", async () => {
    const originalFind = Notification.find;
    const originalConsoleError = console.error;
    const internalError = new Error("private database connection detail");
    let loggedError;
    Notification.find = () => { throw internalError; };
    console.error = (error) => { loggedError = error; };

    const res = {
        statusCode: 200,
        body: null,
        status(code) { this.statusCode = code; return this; },
        json(body) { this.body = body; return this; },
    };

    try {
        await getNotification({ user: { _id: "user-id" } }, res);
        assert.equal(res.statusCode, 500);
        assert.deepEqual(res.body, { message: "Đã xảy ra lỗi, vui lòng thử lại sau." });
        assert.equal(JSON.stringify(res.body).includes(internalError.message), false);
        assert.equal(loggedError, internalError);
    } finally {
        Notification.find = originalFind;
        console.error = originalConsoleError;
    }
});
