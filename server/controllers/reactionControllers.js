const Comment = require("../models/Comment");
const Message = require("../models/Message");
const Conversation = require("../models/Conversation");
const User = require("../models/User");
const Notification = require("../models/Notification");
const errorResponse = require("../utils/errorResponse");
const { emitToUser } = require("../utils/realtime");
const { isReactionType, withLegacyLikes, applyReaction, listReactions, REACTION_TYPES, idOf } = require("../utils/reactions");
const { loadAccessiblePost } = require("../utils/postAccess");

const plain = (reactions = []) => reactions.map((item) => ({ userId: item.userId, reaction: item.reaction }));

const blockedEitherWay = (viewer, other) =>
    (viewer.blockList || []).some((id) => idOf(id) === idOf(other._id)) ||
    (other.blockList || []).some((id) => idOf(id) === idOf(viewer._id));

const loadReactablePost = (req, postId) => loadAccessiblePost(req.user, postId);

async function notifyReaction({ recipientId, senderId, reaction, postId, commentId = null }) {
    if (idOf(recipientId) === idOf(senderId)) return;
    try {
        await Notification.create({ recipientId, senderId, type: "like", reaction, postId, commentId });
    } catch (error) {
        console.error("Could not create reaction notification:", error);
    }
}

const readType = (req) => (req.method === "DELETE" ? null : req.body?.type);

function badType(res) {
    return res.status(400).json({ message: "Loại cảm xúc không hợp lệ!" });
}

const reactToPost = async (req, res) => {
    try {
        const reaction = readType(req);
        if (reaction !== null && !isReactionType(reaction)) return badType(res);

        const post = await loadReactablePost(req, req.params.id);
        if (!post) return res.status(404).json({ message: "Bài viết không tồn tại!" });

        const result = applyReaction(withLegacyLikes(post.reactions, post.likes), req.user._id, reaction);
        post.reactions = result.reactions;
        // `likes` stays "everybody who reacted", so old counters keep working.
        post.likes = result.reactions.map((item) => item.userId);
        await post.save();

        if (reaction && !result.previous) {
            await notifyReaction({ recipientId: post.authorId, senderId: req.user._id, reaction, postId: post._id });
        }
        return res.status(200).json({
            message: reaction ? "Đã thả cảm xúc!" : "Đã bỏ cảm xúc!",
            reactions: plain(post.reactions),
            likes: post.likes,
            myReaction: reaction,
        });
    } catch (error) {
        if (error.name === "CastError") return res.status(400).json({ message: "ID bài viết không hợp lệ!" });
        return errorResponse(res, error);
    }
};

function reactionListOptions(req, res) {
        const type = req.query.type;
        if (type !== undefined && !isReactionType(type)) { badType(res); return null; }
        const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
        const limit = Math.min(50, Math.max(1, Number.parseInt(req.query.limit, 10) || 30));
        return { type, page, limit };
}

async function sendReactionList(req, res, reactions, { type, page, limit }) {
        reactions = plain(reactions);
        const ids = [...new Set(reactions.map((item) => idOf(item.userId)))];
        const users = await User.find({ _id: { $in: ids } }).select("username profilePicture isLocked blockList");
        const byId = new Map(users.map((user) => [idOf(user._id), user]));
        const blockedIds = users.filter((user) => blockedEitherWay(req.user, user)).map((user) => user._id);
        const populated = reactions.map((item) => {
            const user = byId.get(idOf(item.userId));
            return user && { ...item, userId: { _id: user._id, username: user.username, profilePicture: user.profilePicture, isLocked: user.isLocked } };
        }).filter(Boolean);
        const result = listReactions(populated, { viewerId: req.user._id, blockedIds, type, page, limit });
        result.counts = Object.fromEntries(REACTION_TYPES.map((reactionType) => [reactionType, result.counts[reactionType] || 0]));
        return res.json(result);
}

const getPostReactions = async (req, res) => {
    try {
        const options = reactionListOptions(req, res);
        if (!options) return res;
        const post = await loadReactablePost(req, req.params.id);
        if (!post) return res.status(404).json({ message: "Bài viết không tồn tại!" });
        return await sendReactionList(req, res, withLegacyLikes(post.reactions, post.likes), options);
    } catch (error) {
        if (error.name === "CastError") return res.status(400).json({ message: "ID bài viết không hợp lệ!" });
        return errorResponse(res, error);
    }
};

const getCommentReactions = async (req, res) => {
    try {
        const options = reactionListOptions(req, res);
        if (!options) return res;
        const comment = await Comment.findOne({ _id: req.params.id, status: "active" });
        if (!comment) return res.status(404).json({ message: "Bình luận không tồn tại!" });
        const post = await loadReactablePost(req, comment.postId);
        if (!post) return res.status(404).json({ message: "Bình luận không tồn tại!" });
        return await sendReactionList(req, res, comment.reactions, options);
    } catch (error) {
        if (error.name === "CastError") return res.status(400).json({ message: "ID bình luận không hợp lệ!" });
        return errorResponse(res, error);
    }
};

const reactToComment = async (req, res) => {
    try {
        const reaction = readType(req);
        if (reaction !== null && !isReactionType(reaction)) return badType(res);

        const comment = await Comment.findOne({ _id: req.params.id, status: "active" });
        if (!comment) return res.status(404).json({ message: "Bình luận không tồn tại!" });
        const post = await loadReactablePost(req, comment.postId);
        if (!post) return res.status(404).json({ message: "Bình luận không tồn tại!" });

        const result = applyReaction(comment.reactions, req.user._id, reaction);
        comment.reactions = result.reactions;
        await comment.save();

        if (reaction && !result.previous) {
            await notifyReaction({
                recipientId: comment.authorId, senderId: req.user._id, reaction,
                postId: comment.postId, commentId: comment._id,
            });
        }
        return res.status(200).json({
            message: reaction ? "Đã thả cảm xúc!" : "Đã bỏ cảm xúc!",
            reactions: plain(comment.reactions),
            myReaction: reaction,
        });
    } catch (error) {
        if (error.name === "CastError") return res.status(400).json({ message: "ID bình luận không hợp lệ!" });
        return errorResponse(res, error);
    }
};

const reactToMessage = async (req, res) => {
    try {
        const reaction = readType(req);
        if (reaction !== null && !isReactionType(reaction)) return badType(res);

        const { conversationId, messageId } = req.params;
        const conversation = await Conversation.findById(conversationId);
        const myId = idOf(req.user._id);
        const participants = (conversation?.participants || []).map(idOf);
        if (!conversation || !participants.includes(myId) ||
            (conversation.hiddenFor || []).some((id) => idOf(id) === myId)) {
            return res.status(404).json({ message: "Không tìm thấy cuộc trò chuyện!" });
        }
        const otherId = participants.find((id) => id !== myId);
        const other = otherId ? await User.findById(otherId).select("blockList") : null;
        if (!other || blockedEitherWay(req.user, other)) {
            return res.status(403).json({ message: "Không thể thả cảm xúc khi một trong hai người đã chặn người còn lại!" });
        }

        const message = await Message.findOne({ _id: messageId, conversationId: conversation._id });
        if (!message) return res.status(404).json({ message: "Không tìm thấy tin nhắn!" });

        const result = applyReaction(message.reactions, req.user._id, reaction);
        message.reactions = result.reactions;
        await message.save();

        // Instant update for both people (and the sender's other tabs).
        const payload = {
            conversationId: idOf(conversation._id),
            messageId: idOf(message._id),
            reactions: plain(message.reactions),
        };
        emitToUser(otherId, "message:reaction", payload);
        emitToUser(req.user._id, "message:reaction", payload);

        return res.status(200).json({ message: "Đã cập nhật cảm xúc!", ...payload, myReaction: reaction });
    } catch (error) {
        if (error.name === "CastError") return res.status(400).json({ message: "ID không hợp lệ!" });
        return errorResponse(res, error);
    }
};

module.exports = { reactToPost, getPostReactions, getCommentReactions, reactToComment, reactToMessage };
