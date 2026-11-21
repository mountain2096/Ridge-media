// Pure helpers for Facebook-style reactions. Used for posts, comments and
// chat messages. A reaction list looks like [{ userId, reaction }]: at most
// one entry per user.

const REACTION_TYPES = ["like", "love", "haha", "wow", "sad", "angry"];

const idOf = (value) => String(value?._id || value || "");

const isReactionType = (value) => typeof value === "string" && REACTION_TYPES.includes(value);

// Posts used to keep only a `likes` array of user ids. Treat every liker that
// has no reaction entry as a plain "like", so old data keeps working.
function withLegacyLikes(reactions = [], likes = []) {
    const list = (reactions || []).map((item) => ({ userId: item.userId, reaction: item.reaction }));
    const seen = new Set(list.map((item) => idOf(item.userId)));
    for (const likerId of likes || []) {
        const id = idOf(likerId);
        if (id && !seen.has(id)) {
            list.push({ userId: likerId, reaction: "like" });
            seen.add(id);
        }
    }
    return list;
}

// Set (`reaction` is a type) or remove (`reaction` is null) one user's
// reaction. Returns the new list plus the user's previous reaction.
function applyReaction(reactions = [], userId, reaction) {
    const uid = idOf(userId);
    const list = (reactions || []).map((item) => ({ userId: item.userId, reaction: item.reaction }));
    const index = list.findIndex((item) => idOf(item.userId) === uid);
    const previous = index >= 0 ? list[index].reaction : null;

    if (reaction === null) {
        if (index >= 0) list.splice(index, 1);
    } else if (index >= 0) {
        list[index] = { userId: list[index].userId, reaction };
    } else {
        list.push({ userId, reaction });
    }
    return { reactions: list, previous, current: reaction };
}

function countReactions(reactions = []) {
    const counts = Object.fromEntries(REACTION_TYPES.map((type) => [type, 0]));
    for (const item of reactions || []) {
        if (counts[item.reaction] !== undefined) counts[item.reaction] += 1;
    }
    return { counts, total: Object.values(counts).reduce((sum, value) => sum + value, 0) };
}

module.exports = { REACTION_TYPES, isReactionType, withLegacyLikes, applyReaction, countReactions, idOf };
