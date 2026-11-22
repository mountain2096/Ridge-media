const test = require("node:test");
const assert = require("node:assert/strict");
const Notification = require("../models/Notification");
const Story = require("../models/Story");
const { getNotification } = require("../controllers/notificationController");
const { createStory } = require("../controllers/storyControllers");

function response() {
    return {
        statusCode: 200,
        body: null,
        status(code) { this.statusCode = code; return this; },
        json(body) { this.body = body; return this; },
    };
}

const request = (body = {}, query = {}) => ({
    body,
    query,
    protocol: "http",
    headers: { host: "localhost:5000" },
    get(name) { return this.headers[name.toLowerCase()]; },
    user: { _id: "user-id" },
});

test("notifications exclude chat messages and paginate while retaining the notifications key", async (t) => {
    const originalFind = Notification.find;
    t.after(() => { Notification.find = originalFind; });
    let filter;
    let skip;
    let limit;
    const chain = {
        populate() { return this; }, sort() { return this; },
        skip(value) { skip = value; return this; },
        limit(value) { limit = value; return this; },
        then(resolve, reject) { return Promise.resolve([]).then(resolve, reject); },
    };
    Notification.find = (value) => { filter = value; return chain; };

    const res = response();
    await getNotification(request({}, { page: "2", limit: "10" }), res);
    assert.equal(res.statusCode, 200);
    assert.deepEqual(filter, { recipientId: "user-id", type: { $ne: "message" } });
    assert.equal(skip, 10);
    assert.equal(limit, 10);
    assert.deepEqual(res.body, { notifications: [] });
});

test("notifications default to 30 and reject limits above 50", async (t) => {
    const originalFind = Notification.find;
    t.after(() => { Notification.find = originalFind; });
    let limit;
    Notification.find = () => ({
        populate() { return this; }, sort() { return this; }, skip() { return this; },
        limit(value) { limit = value; return this; }, then(resolve) { resolve([]); },
    });
    await getNotification(request(), response());
    assert.equal(limit, 30);

    const res = response();
    await getNotification(request({}, { limit: "51" }), res);
    assert.equal(res.statusCode, 400);
});

test("stories accept only local uploads whose extension matches their media type", async (t) => {
    const originalCreate = Story.create;
    t.after(() => { Story.create = originalCreate; });
    Story.create = async (data) => ({ ...data, populate: async () => {} });

    for (const [mediaType, extension] of [["image", "jpg"], ["video", "webm"]]) {
        const res = response();
        await createStory(request({
            mediaType,
            mediaUrl: `http://localhost:5000/uploads/123e4567-e89b-42d3-a456-426614174000.${extension}`,
        }), res);
        assert.equal(res.statusCode, 201);
    }

    for (const [mediaType, extension] of [["image", "mp4"], ["video", "png"]]) {
        const res = response();
        await createStory(request({
            mediaType,
            mediaUrl: `http://localhost:5000/uploads/123e4567-e89b-42d3-a456-426614174000.${extension}`,
        }), res);
        assert.equal(res.statusCode, 400);
    }

    const external = response();
    await createStory(request({ mediaType: "image", mediaUrl: "https://evil.example/photo.jpg" }), external);
    assert.equal(external.statusCode, 400);
});
