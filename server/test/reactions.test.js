const test = require("node:test");
const assert = require("node:assert/strict");

const {
    REACTION_TYPES, isReactionType, withLegacyLikes, applyReaction, countReactions, listReactions,
} = require("../utils/reactions");

test("only the six known reaction types are accepted", () => {
    assert.deepEqual(REACTION_TYPES, ["like", "love", "haha", "wow", "sad", "angry"]);
    for (const type of REACTION_TYPES) assert.equal(isReactionType(type), true);
    for (const bad of ["", "LIKE", "heart", null, undefined, 1, {}, ["like"]]) {
        assert.equal(isReactionType(bad), false);
    }
});

test("listReactions filters locked and blocked users, keeps viewer, and counts before paging", () => {
    const reactions = [
        { userId: { _id: "me", isLocked: true }, reaction: "love" },
        { userId: { _id: "blocked", isLocked: false }, reaction: "like" },
        { userId: { _id: "locked", isLocked: true }, reaction: "sad" },
        { userId: { _id: "u2", username: "Two" }, reaction: "like" },
        { userId: { _id: "u3", username: "Three" }, reaction: "wow" },
    ];
    const result = listReactions(reactions, { viewerId: "me", blockedIds: ["blocked"], page: 2, limit: 1 });
    assert.deepEqual(result.counts, { like: 1, love: 1, haha: 0, wow: 1, sad: 0, angry: 0 });
    assert.equal(result.total, 3);
    assert.deepEqual(result.pagination, { page: 2, limit: 1, pages: 3 });
    assert.deepEqual(result.items, [{ user: { _id: "u2", username: "Two", profilePicture: undefined }, reaction: "like" }]);
    assert.equal(listReactions(reactions, { type: "like", viewerId: "me", blockedIds: ["blocked"] }).total, 1);
});

test("listReactions returns zero pages for empty lists and keeps totals beyond the last page", () => {
    const empty = listReactions();
    assert.deepEqual(empty.counts, { like: 0, love: 0, haha: 0, wow: 0, sad: 0, angry: 0 });
    assert.deepEqual(empty.items, []);
    assert.deepEqual(empty.pagination, { page: 1, limit: 30, pages: 0 });

    const result = listReactions([
        { userId: { _id: "u1", username: "One" }, reaction: "like" },
        { userId: { _id: "u2", username: "Two" }, reaction: "love" },
    ], { page: 3, limit: 1 });
    assert.equal(result.total, 2);
    assert.deepEqual(result.items, []);
    assert.deepEqual(result.counts, { like: 1, love: 1, haha: 0, wow: 0, sad: 0, angry: 0 });
    assert.deepEqual(result.pagination, { page: 3, limit: 1, pages: 2 });
});

test("applyReaction sets, switches and removes one reaction per user", () => {
    let result = applyReaction([], "u1", "love");
    assert.deepEqual(result.reactions, [{ userId: "u1", reaction: "love" }]);
    assert.equal(result.previous, null);

    result = applyReaction(result.reactions, "u2", "wow");
    assert.equal(result.reactions.length, 2);

    // Switching replaces the old reaction instead of adding a second one.
    result = applyReaction(result.reactions, "u1", "angry");
    assert.equal(result.previous, "love");
    assert.deepEqual(result.reactions.filter((item) => item.userId === "u1"), [{ userId: "u1", reaction: "angry" }]);
    assert.equal(result.reactions.length, 2);

    result = applyReaction(result.reactions, "u1", null);
    assert.equal(result.previous, "angry");
    assert.deepEqual(result.reactions, [{ userId: "u2", reaction: "wow" }]);

    // Removing when nothing was set is harmless.
    result = applyReaction(result.reactions, "u9", null);
    assert.equal(result.previous, null);
    assert.equal(result.reactions.length, 1);
});

test("applyReaction does not change the list it was given", () => {
    const original = [{ userId: "u1", reaction: "like" }];
    applyReaction(original, "u1", "sad");
    assert.deepEqual(original, [{ userId: "u1", reaction: "like" }]);
});

test("old likes without a reaction entry count as Like", () => {
    const merged = withLegacyLikes([{ userId: "u2", reaction: "haha" }], ["u1", "u2", "u3"]);
    assert.deepEqual(merged, [
        { userId: "u2", reaction: "haha" },
        { userId: "u1", reaction: "like" },
        { userId: "u3", reaction: "like" },
    ]);
    // A legacy liker who switches reaction ends with exactly one entry.
    const switched = applyReaction(merged, "u1", "love");
    assert.equal(switched.previous, "like");
    assert.equal(switched.reactions.filter((item) => item.userId === "u1").length, 1);
});

test("countReactions totals each type", () => {
    const { counts, total } = countReactions([
        { userId: "a", reaction: "like" }, { userId: "b", reaction: "like" },
        { userId: "c", reaction: "sad" },
    ]);
    assert.equal(total, 3);
    assert.equal(counts.like, 2);
    assert.equal(counts.sad, 1);
    assert.equal(counts.angry, 0);
});
