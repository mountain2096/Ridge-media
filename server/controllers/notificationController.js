const Notification = require("../models/Notification");

const getNotification = async (req, res) =>{
    try{
        const notifications = await Notification.find({
            recipientId: req.user._id
        }).populate("senderId", "username profilePicture")
        .sort({ createdAt: -1})
        
        res.status(200).json({
            notifications
        })
    } catch (err){
        res.status(500).json({
            message: err.message
        })
    }
}
const markNotificationIsRead = async (req, res) =>{
    try{
        const notification = await Notification.findById(req.params.id);

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
        res.status(400).json({
            message:err.message
        })
    }
}
module.exports = {
    getNotification,
    markNotificationIsRead
}