const Notification = require("../models/Notification");
const errorResponse = require("../utils/errorResponse");


const getNotification = async (req, res) =>{
    try{
        const notifications = await Notification.find({
            recipientId: req.user._id,
            type: { $ne: "message" },
        }).populate("senderId", "username profilePicture")
        .populate({ path: "postId", select: "content image video originalPostId status", match: { status: "active" } })
        .populate({ path: "commentId", select: "content", match: { status: "active" } })
        .sort({ createdAt: -1}).limit(50)
        
        res.status(200).json({
            notifications
        })
    } catch (err){
        return errorResponse(res, err);
    }
}
const markNotificationIsRead = async (req, res) =>{
    try{
        const notification = await Notification.findOne({
            _id: req.params.id,
            recipientId: req.user._id,
            type: { $ne: "message" },
        });

        if(!notification){
            return res.status(400).json({
                message:"Khong tim thay thong bao!"
            })
        }

        notification.isRead = true;

        await notification.save();

        res.status(200).json({
            message: "Đã đọc!"
        })
    } catch(err){
        if (err.name === "CastError") return res.status(400).json({ message: "ID thông báo không hợp lệ!" });
        return errorResponse(res, err);
    }
}
const markAllNotificationsAsRead = async (req, res) => {
    try {
        await Notification.updateMany({ recipientId: req.user._id }, { isRead: true });
        res.status(200).json({ ok: true });
    } catch (err) {
        return errorResponse(res, err);
    }
}
const deleteNotification = async (req, res) => {
    try {
        const notification = await Notification.findOneAndDelete({ _id: req.params.id, recipientId: req.user._id });
        if (!notification) return res.status(404).json({ message: "Không tìm thấy thông báo!" });
        res.status(200).json({ ok: true });
    } catch (err) {
        if (err.name === "CastError") return res.status(400).json({ message: "ID thông báo không hợp lệ!" });
        return errorResponse(res, err);
    }
}
const deleteAllNotifications = async (req, res) => {
    try {
        const result = await Notification.deleteMany({ recipientId: req.user._id });
        res.status(200).json({ deleted: result.deletedCount });
    } catch (err) {
        return errorResponse(res, err);
    }
}
module.exports = {
    getNotification,
    markNotificationIsRead,
    markAllNotificationsAsRead,
    deleteNotification,
    deleteAllNotifications
}
