const Post = require("../models/Post");
const User = require("../models/User");

const idOf = (value) => String(value?._id || value || "");

function blockedEitherWay(viewer, author) {
    return (viewer.blockList || []).some((id) => idOf(id) === idOf(author._id)) ||
        (author.blockList || []).some((id) => idOf(id) === idOf(viewer._id));
}

async function canAccessPost(viewer, post) {
    if (!post || (post.status && post.status !== "active")) return false;
    const author = await User.findById(post.authorId).select("blockList");
    if (!author) return false;
    const isOwner = idOf(post.authorId) === idOf(viewer._id);
    const isFriend = (viewer.friend || []).some((id) => idOf(id) === idOf(post.authorId));
    return (isOwner || !blockedEitherWay(viewer, author)) &&
        (post.privacy === "public" || isOwner || (post.privacy === "friends" && isFriend));
}

async function loadAccessiblePost(viewer, postId) {
    const post = await Post.findOne({ _id: postId, status: "active" });
    return await canAccessPost(viewer, post) ? post : null;
}

module.exports = { canAccessPost, loadAccessiblePost };
