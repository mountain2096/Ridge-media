const GENERIC_ERROR_MESSAGE = "Đã xảy ra lỗi, vui lòng thử lại sau.";

function errorResponse(res, error) {
    console.error(error);
    return res.status(500).json({ message: GENERIC_ERROR_MESSAGE });
}

module.exports = errorResponse;
