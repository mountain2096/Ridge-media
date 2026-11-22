const errorResponse = require("../utils/errorResponse");
const User = require("../models/User");
const getPublicPosts = require("../utils/publicPosts");

const invalidId = (id) => !/^[a-f\d]{24}$/i.test(id);
const invalidIdMessage = "ID người dùng không hợp lệ!";
const missingUserMessage = "Người dùng không tồn tại!";
const hasInvalidPagination = (query) => {
    const page = Number(query.page ?? 1);
    const limit = Number(query.limit ?? 20);
    return !Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 50;
};

async function getPublicUser(req, res) {
    if (invalidId(req.params.id)) return res.status(400).json({ message: invalidIdMessage });
    try {
        const user = await User.findById(req.params.id).select("username profilePicture coverPicture bio createdAt friend isLocked");
        if (!user || user.isLocked) return res.status(404).json({ message: missingUserMessage });
        const { _id, username, profilePicture, coverPicture, bio, createdAt, friend } = user;
        return res.status(200).json({ user: { _id, username, profilePicture, coverPicture, bio, createdAt, friendCount: friend.length } });
    } catch (error) {
        if (error.name === "CastError") return res.status(400).json({ message: invalidIdMessage });
        return errorResponse(res, error);
    }
}

async function getPosts(req, res, authorId) {
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 20);
    if (hasInvalidPagination(req.query)) {
        return res.status(400).json({ message: "Tham số phân trang không hợp lệ!" });
    }
    try {
        return res.status(200).json(await getPublicPosts({ page, limit, authorId }));
    } catch (error) {
        return errorResponse(res, error);
    }
}

async function getPublicUserPosts(req, res) {
    if (invalidId(req.params.id)) return res.status(400).json({ message: invalidIdMessage });
    if (hasInvalidPagination(req.query)) return res.status(400).json({ message: "Tham số phân trang không hợp lệ!" });
    try {
        const user = await User.findById(req.params.id).select("_id isLocked");
        if (!user || user.isLocked) return res.status(404).json({ message: missingUserMessage });
        return getPosts(req, res, user._id);
    } catch (error) {
        if (error.name === "CastError") return res.status(400).json({ message: invalidIdMessage });
        return errorResponse(res, error);
    }
}

module.exports = { getPublicUser, getPublicUserPosts };
