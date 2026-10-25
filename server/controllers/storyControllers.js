const Story = require("../models/Story");

const createStory = async (req, res) => {
    try {
        const { mediaUrl, mediaType } = req.body;
        if (typeof mediaUrl !== "string" || !mediaUrl.trim() ||
            !["image", "video"].includes(mediaType)) {
            return res.status(400).json({ message: "Thông tin story không hợp lệ!" });
        }

        let parsedUrl;
        try {
            parsedUrl = new URL(mediaUrl.trim());
        } catch {
            return res.status(400).json({ message: "Đường dẫn media không hợp lệ!" });
        }
        if (!["http:", "https:"].includes(parsedUrl.protocol)) {
            return res.status(400).json({ message: "Đường dẫn media phải dùng HTTP hoặc HTTPS!" });
        }

        const story = await Story.create({
            authorId: req.user._id,
            mediaUrl: parsedUrl.toString(),
            mediaType,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        });
        await story.populate("authorId", "username profilePicture");

        res.status(201).json({ message: "Đã đăng story!", story });
    } catch (error) {
        res.status(500).json({ message: error.message });
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
        res.status(500).json({ message: error.message });
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
        res.status(error.name === "CastError" ? 400 : 500).json({
            message: error.name === "CastError" ? "ID story không hợp lệ!" : error.message,
        });
    }
};

module.exports = { createStory, getStories, deleteStory };
