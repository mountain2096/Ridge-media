const Story = require("../models/Story");
const errorResponse = require("../utils/errorResponse");
const validateMediaUrl = require("../utils/validateMediaUrl");
const Notification = require("../models/Notification");
const { isReactionType } = require("../utils/reactions");
const { findOrCreateConversation, createAndEmitMessage } = require("./messageCotrollers");

const activeStory = (id) => Story.findOne({ _id: id, expiresAt: { $gt: new Date() } });

const createStory = async (req, res) => {
    try {
        const { mediaUrl, mediaType } = req.body;
        if (typeof mediaUrl !== "string" || !mediaUrl.trim() ||
            !["image", "video"].includes(mediaType)) {
            return res.status(400).json({ message: "Thông tin story không hợp lệ!" });
        }

        const url = mediaUrl.trim();
        const pathname = url.startsWith("/") ? url : (() => { try { return new URL(url).pathname; } catch { return ""; } })();
        const extension = pathname.split(".").pop().toLowerCase();
        const image = ["jpg", "png", "webp", "gif"].includes(extension);
        const video = ["mp4", "webm"].includes(extension);
        if (!validateMediaUrl(url, req) || (mediaType === "image" ? !image : !video)) return res.status(400).json({ message: "Đường dẫn media không hợp lệ!" });

        const story = await Story.create({
            authorId: req.user._id,
            mediaUrl: url,
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
            .populate("reactions.user", "username profilePicture")
            .sort({ createdAt: 1 });

        for (const story of stories) {
            const owner = story.authorId?._id?.toString() === req.user._id.toString();
            story.reactions = story.reactions.filter((item) => owner || item.user?._id?.toString() === req.user._id.toString());
        }

        res.status(200).json({ stories });
    } catch (error) {
        return errorResponse(res, error);
    }
};

const reactToStory = async (req, res) => {
    try {
        const type = req.method === "DELETE" ? null : req.body?.type;
        if (type !== null && !isReactionType(type)) return res.status(400).json({ message: "Loại cảm xúc không hợp lệ!" });
        const story = await activeStory(req.params.id);
        if (!story) return res.status(404).json({ message: "Không tìm thấy story còn hạn!" });
        const uid = req.user._id.toString();
        const index = story.reactions.findIndex((item) => item.user.toString() === uid);
        const previous = index < 0 ? null : story.reactions[index].type;
        if (type === null) { if (index >= 0) story.reactions.splice(index, 1); }
        else if (index >= 0) story.reactions[index].type = type;
        else story.reactions.push({ user: req.user._id, type });
        await story.save();
        if (type && previous !== type && story.authorId.toString() !== uid) await Notification.create({ recipientId: story.authorId, senderId: req.user._id, type: "story_reaction", reaction: type });
        return res.json({ reactions: story.reactions.filter((item) => item.user.toString() === uid), myReaction: type });
    } catch (error) { if (error.name === "CastError") return res.status(400).json({ message: "ID story không hợp lệ!" }); return errorResponse(res, error); }
};

const replyToStory = async (req, res) => {
    try {
        if (typeof req.body?.content !== "string" || !req.body.content.trim()) return res.status(400).json({ message: "Nội dung không được để trống!" });
        const story = await activeStory(req.params.id);
        if (!story) return res.status(404).json({ message: "Không tìm thấy story còn hạn!" });
        if (story.authorId.toString() === req.user._id.toString()) return res.status(400).json({ message: "Bạn không thể trả lời story của mình!" });
        const conversation = await findOrCreateConversation(req.user._id, story.authorId);
        const message = await createAndEmitMessage(conversation, req.user._id, story.authorId, {
            type: "story_reply", content: req.body.content.trim(),
            storyRef: { storyId: story._id, ownerId: story.authorId, mediaType: story.mediaType, mediaUrl: story.mediaUrl, caption: story.caption || "" },
        });
        return res.status(201).json({ message });
    } catch (error) { if (error.name === "CastError") return res.status(400).json({ message: "ID story không hợp lệ!" }); return errorResponse(res, error); }
};

const getStoryReactions = async (req, res) => {
    try {
        const story = await activeStory(req.params.id);
        if (!story) return res.status(404).json({ message: "Không tìm thấy story còn hạn!" });
        if (story.authorId.toString() !== req.user._id.toString()) return res.status(403).json({ message: "Chỉ chủ story mới xem được danh sách!" });
        await story.populate("reactions.user", "username profilePicture");
        return res.json({ reactions: story.reactions });
    } catch (error) { if (error.name === "CastError") return res.status(400).json({ message: "ID story không hợp lệ!" }); return errorResponse(res, error); }
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

module.exports = { createStory, getStories, deleteStory, reactToStory, replyToStory, getStoryReactions };
