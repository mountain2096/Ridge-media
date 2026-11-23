const fields = { Post: ["image", "video"], Story: ["mediaUrl"], Message: ["mediaUrl"], User: ["profilePicture", "coverPicture"] };

function relativeUploadUrl(value) {
    if (typeof value !== "string") return null;
    try {
        const url = new URL(value);
        return /^https?:$/.test(url.protocol) && /^\/uploads\/[A-Za-z0-9._-]+\.(jpg|png|webp|gif|mp4|webm)$/i.test(url.pathname) && !url.search && !url.hash
            ? url.pathname : null;
    } catch { return null; }
}

module.exports = { fields, relativeUploadUrl };
