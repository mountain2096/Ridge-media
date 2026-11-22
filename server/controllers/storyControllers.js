const Story = require("../models/Story");
const errorResponse = require("../utils/errorResponse");
const validateMediaUrl = require("../utils/validateMediaUrl");

const createStory = async (req, res) => {
    try {
        const { mediaUrl, mediaType } = req.body;
        if (typeof mediaUrl !== "string" || !mediaUrl.trim() ||
            !["image", "video"].includes(mediaType)) {
            return res.status(400).json({ message: "Thông tin story không hợp lệ!" });
        }

        if (!validateMediaUrl(mediaUrl, req)) {
            return res.status(400).json({ message: "Media phải là URL hợp lệ từ máy chủ tải lên của chúng tôi." });
        }
        const extension = new URL(mediaUrl).pathname.split(".").pop().toLowerCase();
        if ((mediaType === "image" && !["jpg", "png", "webp", "gif"].includes(extension)) ||
            (mediaType === "video" && !["mp4", "webm"].includes(extension))) {
            return res.status(400).json({ message: "Đường dẫn media không hợp lệ!" });
        }

        const story = await Story.create({
            authorId: req.user._id,
            mediaUrl,
            mediaType,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        });
        await story.populate("authorId", "username profilePicture");

        res.status(201).json({ message: "Đã đăng story!", story });
    } catch (error) {
        return errorResponse(res, error);
    }
};

const getStories = async (req, res) => {
    try {
        const visibleAuthors = [req.user._id, ...req.user.friend];
        const stories = await Story.find({
            authorId: { $in: visibleAuthors },
            expiresAt: { $gt: new Date() },
        })
            .populate("authorId", "username profilePicture")
            .sort({ createdAt: 1 });

        res.status(200).json({ stories });
    } catch (error) {
        return errorResponse(res, error);
    }
};

const deleteStory = async (req, res) => {
    try {
        const story = await Story.findById(req.params.id);
        if (!story) {
            return res.status(404).json({ message: "Không tìm thấy story!" });
        }
        if (story.authorId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "Bạn không có quyền xóa story này!" });
        }

        await story.deleteOne();
        res.status(200).json({ message: "Đã xóa story!" });
    } catch (error) {
        if (error.name === "CastError") return res.status(400).json({ message: "ID story không hợp lệ!" });
        return errorResponse(res, error);
    }
};

module.exports = { createStory, getStories, deleteStory };
