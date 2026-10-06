const getMe = async (req,res) =>{
    res.status(200).json({
        message:"Xác thực thành công!",
        user: req.user,
    })
}
module.exports = {
    getMe,
}