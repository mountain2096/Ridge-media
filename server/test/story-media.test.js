const test = require("node:test");
const assert = require("node:assert/strict");
const Story = require("../models/Story");
const { createStory } = require("../controllers/storyControllers");

test("createStory accepts a relative uploaded media path", async () => {
    const original = Story.create;
    Story.create = async (data) => ({ ...data, populate: async () => {} });
    const res = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
    try {
        await createStory({ body: { mediaUrl: "/uploads/a.jpg", mediaType: "image" }, user: { _id: "u1" } }, res);
        assert.equal(res.statusCode, 201);
        assert.equal(res.body.story.mediaUrl, "/uploads/a.jpg");
    } finally { Story.create = original; }
});
