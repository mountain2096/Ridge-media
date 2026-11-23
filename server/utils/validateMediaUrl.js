const UPLOAD_PATH_PATTERN = /^\/uploads\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(?:jpg|png|webp|gif|mp4|webm)$/i;

function validateMediaUrl(value, req) {
    if (value === undefined || value === null || value === "") {
        return true;
    }
    if (typeof value !== "string" || value.trim() !== value) {
        return false;
    }

    try {
        const mediaUrl = new URL(value);
        const requestHost = req.get?.("host") || req.headers?.host;
        if (!requestHost || !["http:", "https:"].includes(mediaUrl.protocol)) {
            return false;
        }

        const requestOrigin = new URL(`${req.protocol}://${requestHost}`).origin;
        return mediaUrl.origin === requestOrigin &&
            !mediaUrl.username &&
            !mediaUrl.password &&
            !mediaUrl.search &&
            !mediaUrl.hash &&
            UPLOAD_PATH_PATTERN.test(mediaUrl.pathname);
    } catch {
        return false;
    }
}

module.exports = validateMediaUrl;
