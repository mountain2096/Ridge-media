const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { relativeUploadUrl, fields, writeBackup } = require("../utils/migrateMediaUrls");

test("migration maps only supported absolute upload URLs", () => {
    assert.equal(relativeUploadUrl("https://old.example/uploads/a.jpg"), "/uploads/a.jpg");
    assert.equal(relativeUploadUrl("https://old.example/uploads/a.svg"), null);
    assert.equal(relativeUploadUrl("https://old.example/uploads/../a.jpg"), null);
    assert.deepEqual(fields, { Post: ["image", "video"], Story: ["mediaUrl"], Message: ["mediaUrl"], User: ["profilePicture", "coverPicture"] });
});

test("backup writes original fields and refuses to overwrite an existing backup", async () => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), "ridge-media-backup-"));
    try {
        const original = [{ collection: "Post", _id: "id", video: "https://host/uploads/a.mp4" }];
        await writeBackup(directory, original);
        assert.deepEqual(JSON.parse(await fs.readFile(path.join(directory, "media-url-backup.json"), "utf8")), original);
        await assert.rejects(writeBackup(directory, []), { code: "EEXIST" });
    } finally { await fs.rm(directory, { recursive: true, force: true }); }
});
