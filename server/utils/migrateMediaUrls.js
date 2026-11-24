const fields = { Post: ["image", "video"], Story: ["mediaUrl"], Message: ["mediaUrl"], User: ["profilePicture", "coverPicture"] };
const fs = require("node:fs/promises");
const path = require("node:path");

async function writeBackup(directory, documents) {
    await fs.mkdir(directory, { recursive: true });
    await fs.writeFile(path.join(directory, "media-url-backup.json"), JSON.stringify(documents, null, 2), { flag: "wx" });
}

function relativeUploadUrl(value) {
    if (typeof value !== "string") return null;
    try {
        const url = new URL(value);
        return /^https?:$/.test(url.protocol) && /^\/uploads\/[A-Za-z0-9._-]+\.(jpg|png|webp|gif|mp4|webm)$/i.test(url.pathname) && !url.search && !url.hash
            ? url.pathname : null;
    } catch { return null; }
}

module.exports = { fields, relativeUploadUrl, writeBackup };
