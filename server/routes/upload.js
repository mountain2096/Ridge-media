const express = require("express");
const fs = require("node:fs/promises");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const multer = require("multer");
const protect = require("../middlewares/protect");

const router = express.Router();
const uploadDirectory = path.join(__dirname, "..", "uploads");
const allowedMimeTypes = new Map([
    ["image/jpeg", ".jpg"],
    ["image/png", ".png"],
    ["image/webp", ".webp"],
    ["image/gif", ".gif"],
    ["video/mp4", ".mp4"],
    ["video/webm", ".webm"],
]);

const upload = multer({
    storage: multer.diskStorage({
        destination: (_req, _file, callback) => {
            fs.mkdir(uploadDirectory, { recursive: true })
                .then(() => callback(null, uploadDirectory))
                .catch(callback);
        },
        filename: (_req, file, callback) => {
            callback(null, `${randomUUID()}${allowedMimeTypes.get(file.mimetype) || ""}`);
        },
    }),
    limits: { fileSize: 30 * 1024 * 1024, files: 1 },
    fileFilter: (_req, file, callback) => {
        if (!allowedMimeTypes.has(file.mimetype)) {
            callback(new Error("Chỉ hỗ trợ ảnh JPG, PNG, WebP, GIF hoặc video MP4, WebM."));
            return;
        }
        callback(null, true);
    },
});

router.post("/", protect, (req, res, next) => {
    upload.single("file")(req, res, (error) => {
        if (error) {
            const status = error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE"
                ? 413
                : 400;
            const message = error.code === "LIMIT_FILE_SIZE"
                ? "Tệp tải lên không được vượt quá 30 MB."
                : error.message;
            return res.status(status).json({ message });
        }
        next();
    });
}, (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: "Vui lòng chọn một tệp ảnh hoặc video." });
    }

    const mediaType = req.file.mimetype.startsWith("image/") ? "image" : "video";
    return res.status(201).json({
        url: `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`,
        mediaType,
    });
});

module.exports = router;
