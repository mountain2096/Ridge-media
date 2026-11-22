const Post = require("../models/Post");
const User = require("../models/User");
const Comment = require("../models/Comment");
const { withLegacyLikes, countReactions } = require("./reactions");

async function getPublicPosts({ page, limit, authorId }) {
    // shortcut: querying every locked author scales with account count; replace with indexed visibility state if it becomes slow.
    const lockedIds = await User.distinct("_id", { isLocked: true });
    const filter = { privacy: "public", status: "active", authorId: { $nin: lockedIds } };
    if (authorId) filter.authorId = { $eq: authorId, $nin: lockedIds };

    const [posts, total] = await Promise.all([
        Post.find(filter)
            .populate("authorId", "username profilePicture")
            .populate({
                path: "originalPostId",
                select: "content image video authorId privacy status createdAt editedAt",
                match: { privacy: "public", status: "active", authorId: { $nin: lockedIds } },
                populate: { path: "authorId", select: "username profilePicture" },
            })
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit),
        Post.countDocuments(filter),
    ]);
    const counts = posts.length ? await Comment.aggregate([
        { $match: { postId: { $in: posts.map((post) => post._id) }, status: "active" } },
        { $group: { _id: "$postId", count: { $sum: 1 } } },
    ]) : [];
    const commentCountByPost = new Map(counts.map(({ _id, count }) => [_id.toString(), count]));

    return {
        posts: posts.map((post) => {
            const hasOriginalReference = Boolean(post.originalPostId || post.populated?.("originalPostId"));
            const data = post.toObject();
            const { counts: reactionCounts, total: reactionTotal } = countReactions(withLegacyLikes(data.reactions, data.likes));
            delete data.likes;
            delete data.reactions;
            data.reactionCounts = reactionCounts;
            data.reactionTotal = reactionTotal;
            data.isLiked = data.isMine = data.isSaved = false;
            data.commentsCount = commentCountByPost.get(post._id.toString()) || 0;
            data.originalUnavailable = hasOriginalReference && !data.originalPostId;
            if (data.originalUnavailable) data.content = data.image = data.video = "";
            return data;
        }),
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
}

module.exports = getPublicPosts;
