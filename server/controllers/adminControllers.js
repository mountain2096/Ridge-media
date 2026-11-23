const User = require("../models/User");
const Report = require("../models/Report");
const errorResponse = require("../utils/errorResponse");

const listUsers = async (req, res) => {
    try {
        const page = Number(req.query.page ?? 1);
        const limit = Number(req.query.limit ?? 50);
        if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 100) {
            return res.status(400).json({ message: "Tham số phân trang không hợp lệ!" });
        }
        const filter = {};
        if (req.query.isLocked === "true") filter.isLocked = true;
        if (req.query.isLocked === "false") filter.isLocked = false;
        const [users, total] = await Promise.all([
            User.find(filter).select("username email isAdmin isLocked createdAt")
                .sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
            User.countDocuments(filter),
        ]);
        return res.status(200).json({ users, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
    } catch (error) {
        return errorResponse(res, error);
    }
};

const setUserLock = (isLocked) => async (req, res) => {
    try {
        const user = await User.findById(req.params.userId);
        if (!user) return res.status(404).json({ message: "Không tìm thấy người dùng!" });
        if (user.isAdmin && isLocked) {
            return res.status(400).json({ message: "Không thể khóa tài khoản quản trị viên!" });
        }
        user.isLocked = isLocked;
        await user.save();
        return res.status(200).json({ message: isLocked ? "Đã khóa tài khoản!" : "Đã mở khóa tài khoản!", user: {
            id: user._id, username: user.username, isAdmin: user.isAdmin, isLocked: user.isLocked,
        } });
    } catch (error) {
        if (error.name === "CastError") return res.status(400).json({ message: "ID người dùng không hợp lệ!" });
        return errorResponse(res, error);
    }
};

const listReports = async (req, res) => {
    try {
        const filter = {};
        if (req.query.status !== undefined) {
            if (!['pending', 'reviewed', 'actioned'].includes(req.query.status)) {
                return res.status(400).json({ message: "Trạng thái báo cáo không hợp lệ!" });
            }
            filter.status = req.query.status;
        }
        const reports = await Report.find(filter)
            .populate("reporterId", "username")
            .sort({ createdAt: -1 }).limit(100);
        return res.status(200).json({ reports });
    } catch (error) {
        return errorResponse(res, error);
    }
};

const updateReport = async (req, res) => {
    try {
        const { status } = req.body;
        if (!['reviewed', 'actioned'].includes(status)) {
            return res.status(400).json({ message: "Trạng thái xử lý báo cáo không hợp lệ!" });
        }
        const report = await Report.findById(req.params.reportId);
        if (!report) return res.status(404).json({ message: "Không tìm thấy báo cáo!" });
        report.status = status;
        report.reviewedBy = req.user._id;
        report.reviewedAt = new Date();
        await report.save();
        return res.status(200).json({ message: "Đã cập nhật báo cáo!", report });
    } catch (error) {
        if (error.name === "CastError") return res.status(400).json({ message: "ID báo cáo không hợp lệ!" });
        return errorResponse(res, error);
    }
};

module.exports = { listUsers, lockUser: setUserLock(true), unlockUser: setUserLock(false), listReports, updateReport };
