const UPLOAD_PATH_PATTERN = /^\/uploads\/[A-Za-z0-9._-]+\.(?:jpg|png|webp|gif|mp4|webm)$/i;

function validateMediaUrl(value, req) {
    if (value === undefined || value === null || value === "") {
        return true;
    }
    if (typeof value !== "string" || value.trim() !== value) {
        return false;
    }

    if (UPLOAD_PATH_PATTERN.test(value)) return true;
    try {
        const mediaUrl = new URL(value);
        if (!["http:", "https:"].includes(mediaUrl.protocol)) {
            return false;
        }

        return !mediaUrl.username &&
            !mediaUrl.password &&
            !mediaUrl.search &&
            !mediaUrl.hash &&
            UPLOAD_PATH_PATTERN.test(mediaUrl.pathname);
    } catch {
        return false;
    }
}

module.exports = validateMediaUrl;
