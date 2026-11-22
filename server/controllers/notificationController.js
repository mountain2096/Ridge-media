const Notification = require("../models/Notification");
const errorResponse = require("../utils/errorResponse");


const getNotification = async (req, res) =>{
    try{
        const page = Number(req.query?.page ?? 1);
        const limit = Number(req.query?.limit ?? 30);
        if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 50) {
            return res.status(400).json({ message: "Tham số phân trang không hợp lệ!" });
        }
        const notifications = await Notification.find({
            recipientId: req.user._id,
            type: { $ne: "message" },
        }).populate("senderId", "username profilePicture")
        .sort({ createdAt: -1})
        .skip((page - 1) * limit)
        .limit(limit);
        
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
module.exports = {
    getNotification,
    markNotificationIsRead
}
