// Dùng sau protect. Kiểm tra theo dữ liệu trong DB (req.user), không tin cờ trong token.
module.exports = (req, res, next) => {
    if (!req.user?.isAdmin) {
        return res.status(403).json({ message: "Bạn không có quyền quản trị" });
    }
    next();
};