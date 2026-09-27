const User = require('../models/User');
const bcrypt = require('bcryptjs');

// 1. CẬP NHẬT THÔNG TIN NGƯỜI DÙNG
const updateUser = async (req, res) => {
    // Kiểm tra xem người dùng có quyền cập nhật đúng tài khoản của mình không (hoặc là admin)
    if (req.body.userId === req.params.id || req.body.isAdmin) {
        if (req.body.password) {
            try {
                const salt = await bcrypt.genSalt(10);
                req.body.password = await bcrypt.hash(req.body.password, salt);
            } catch (err) {
                return res.status(500).json({ message: err.message });
            }
        }
        try {
            const updatedUser = await User.findByIdAndUpdate(
                req.params.id,
                { $set: req.body },
                { new: true }
            );
            // Ẩn mật khẩu trước khi trả về
            const { password: _, ...userData } = updatedUser._doc;
            res.status(200).json({ message: "Cập nhật thành công!", userData });
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    } else {
        return res.status(403).json({ message: "Bạn chỉ có thể cập nhật tài khoản của chính mình!" });
    }
};

// 2. XÓA TÀI KHOẢN
const deleteUser = async (req, res) => {
    if (req.body.userId === req.params.id || req.body.isAdmin) {
        try {
            await User.findByIdAndDelete(req.params.id);
            res.status(200).json({ message: "Tài khoản đã được xóa thành công!" });
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    } else {
        return res.status(403).json({ message: "Bạn chỉ có thể xóa tài khoản của chính mình!" });
    }
};

// 3. LẤY THÔNG TIN MỘT NGƯỜI DÙNG
const getUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: "Không tìm thấy người dùng!" });
        }
        const { password: _, ...userData } = user._doc;
        res.status(200).json(userData);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// 4. THEO DÕI NGƯỜI DÙNG KHÁC (FOLLOW)
const followUser = async (req, res) => {
    if (req.body.userId !== req.params.id) {
        try {
            const user = await User.findById(req.params.id); // Người được follow
            const currentUser = await User.findById(req.body.userId); // Người đi follow

            if (!user.followers.includes(req.body.userId)) {
                await user.updateOne({ $push: { followers: req.body.userId } });
                await currentUser.updateOne({ $push: { followings: req.params.id } });
                res.status(200).json({ message: "Đã theo dõi người dùng này thành công!" });
            } else {
                res.status(403).json({ message: "Bạn đã theo dõi người này rồi!" });
            }
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    } else {
        res.status(403).json({ message: "Bạn không thể tự theo dõi chính mình!" });
    }
};

// 5. HỦY THEO DÕI NGƯỜI DÙNG (UNFOLLOW)
const unfollowUser = async (req, res) => {
    if (req.body.userId !== req.params.id) {
        try {
            const user = await User.findById(req.params.id);
            const currentUser = await User.findById(req.body.userId);

            if (user.followers.includes(req.body.userId)) {
                await user.updateOne({ $pull: { followers: req.body.userId } });
                await currentUser.updateOne({ $pull: { followings: req.params.id } });
                res.status(200).json({ message: "Đã hủy theo dõi người dùng thành công!" });
            } else {
                res.status(403).json({ message: "Bạn chưa theo dõi người này!" });
            }
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    } else {
        res.status(403).json({ message: "Bạn không thể hủy theo dõi chính mình!" });
    }
};
//6. ĐỔI MẬT KHẨU
const changePassword = async (req, res) =>{
    if(req.body.userId === req.params.id){
        try{
            const user = await User.findById(req.params.id);
            if(!user){
                return res.status(404).json({message:"Không tìm thấy người dùng!"});
            }
            const isPasswordValid = await bcrypt.compare(req.body.oldPassword, user.password);
            if(!isPasswordValid){
                return res.status(400).json({message:"Mật khẩu cũ không chính xác!"})
            }
            const salt = await bcrypt.genSalt(10);
            const hashedNewPassword = await bcrypt.hash(req.body.newPassword, salt)
            user.updateOne({$set:{"password":hashedNewPassword}});
            res.status(200).json({message:"Đổi mật khẩu thành công!"});

        } catch(err){
            res.status(500).json({message:"Lỗi server "+err.message})
        }
    }
}
module.exports = { updateUser, deleteUser, getUser, followUser, unfollowUser, changePassword};