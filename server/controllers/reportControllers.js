const Report = require("../models/Report");
const Post = require("../models/Post");
const Comment = require("../models/Comment");

const createReport = async (req, res) => {
    try {
        const { targetType, targetId, reason, description = "" } = req.body;
        const allowedReasons = ["spam", "violence", "abuse", "misinfo", "other"];
        if (!['post', 'comment'].includes(targetType) || typeof targetId !== "string" ||
            !allowedReasons.includes(reason) || typeof description !== "string" || description.length > 500) {
            return res.status(400).json({ message: "Thông tin báo cáo không hợp lệ!" });
        }

        const Target = targetType === "post" ? Post : Comment;
        const target = await Target.findOne({ _id: targetId, status: "active" });
        if (!target) return res.status(404).json({ message: "Nội dung cần báo cáo không tồn tại!" });

        const report = await Report.create({
            reporterId: req.user._id,
            targetType,
            targetId: target._id,
            reason,
            description: description.trim(),
        });
        return res.status(201).json({ message: "Đã gửi báo cáo!", report });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ message: "Bạn đã báo cáo nội dung này!" });
        }
        return res.status(error.name === "CastError" ? 400 : 500).json({ message: error.message });
    }
};

module.exports = { createReport };
