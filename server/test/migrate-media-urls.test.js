const test = require("node:test");
const assert = require("node:assert/strict");
const { relativeUploadUrl, fields } = require("../utils/migrateMediaUrls");

test("migration maps only supported absolute upload URLs", () => {
    assert.equal(relativeUploadUrl("https://old.example/uploads/a.jpg"), "/uploads/a.jpg");
    assert.equal(relativeUploadUrl("https://old.example/uploads/a.svg"), null);
    assert.equal(relativeUploadUrl("https://old.example/uploads/../a.jpg"), null);
    assert.deepEqual(fields, { Post: ["image", "video"], Story: ["mediaUrl"], Message: ["mediaUrl"], User: ["profilePicture", "coverPicture"] });
});
