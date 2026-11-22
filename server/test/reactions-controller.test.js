const test = require("node:test");
const assert = require("node:assert/strict");

const Post = require("../models/Post");
const Comment = require("../models/Comment");
const Message = require("../models/Message");
const Conversation = require("../models/Conversation");
const User = require("../models/User");
const Notification = require("../models/Notification");
const { reactToPost, getPostReactions, reactToComment, reactToMessage } = require("../controllers/reactionControllers");
const { setIO } = require("../utils/realtime");

const ME = "64b000000000000000000001";
const AUTHOR = "64b000000000000000000002";
const POST_ID = "64b0000000000000000000a1";
const COMMENT_ID = "64b0000000000000000000b1";
const CONVERSATION_ID = "64b0000000000000000000c1";
const MESSAGE_ID = "64b0000000000000000000d1";

function response() {
    return {
        statusCode: 200, body: null,
        status(code) { this.statusCode = code; return this; },
        json(body) { this.body = body; return this; },
    };
}

function stubs() {
    const original = {
        postFind: Post.findOne, commentFind: Comment.findOne, messageFind: Message.findOne,
        conversationFind: Conversation.findById, userFind: User.findById, usersFind: User.find, notificationCreate: Notification.create,
    };
    const notifications = [];
    Notification.create = async (data) => { notifications.push(data); return data; };
    User.findById = () => ({ select: async () => ({ _id: AUTHOR, blockList: [] }) });
    return {
        notifications,
        restore() {
            Post.findOne = original.postFind; Comment.findOne = original.commentFind;
            Message.findOne = original.messageFind; Conversation.findById = original.conversationFind;
            User.findById = original.userFind; User.find = original.usersFind; Notification.create = original.notificationCreate;
            setIO(null);
        },
    };
}

const fakePost = (extra = {}) => ({
    _id: POST_ID, authorId: AUTHOR, privacy: "public", likes: [], reactions: [],
    async save() {}, ...extra,
});

const call = (handler, method, type, extra = {}) => {
    const res = response();
    return handler({ method, params: { id: POST_ID }, body: type ? { type } : {}, user: { _id: ME, blockList: [], friend: [] }, ...extra }, res)
        .then(() => res);
};

test("post: set, switch and remove a reaction, notify the author once", async () => {
    const s = stubs();
    const post = fakePost();
    Post.findOne = async () => post;
    try {
        let res = await call(reactToPost, "PUT", "love");
        assert.equal(res.statusCode, 200);
        assert.deepEqual(post.reactions, [{ userId: ME, reaction: "love" }]);
        assert.deepEqual(post.likes, [ME]);
        assert.equal(s.notifications.length, 1);
        assert.equal(s.notifications[0].recipientId, AUTHOR);
        assert.equal(s.notifications[0].reaction, "love");

        // Switching changes the reaction without a second notification.
        res = await call(reactToPost, "PUT", "angry");
        assert.deepEqual(post.reactions, [{ userId: ME, reaction: "angry" }]);
        assert.equal(s.notifications.length, 1);
        assert.equal(res.body.myReaction, "angry");

        res = await call(reactToPost, "DELETE", null);
        assert.equal(res.statusCode, 200);
        assert.deepEqual(post.reactions, []);
        assert.deepEqual(post.likes, []);
    } finally { s.restore(); }
});

test("post: invalid type is rejected and an old like is mapped to Like", async () => {
    const s = stubs();
    const post = fakePost({ likes: [ME] });
    Post.findOne = async () => post;
    try {
        let res = await call(reactToPost, "PUT", "heart");
        assert.equal(res.statusCode, 400);
        assert.deepEqual(post.reactions, []);

        res = await call(reactToPost, "PUT", "wow");
        assert.equal(res.statusCode, 200);
        assert.deepEqual(post.reactions, [{ userId: ME, reaction: "wow" }]);
        // Switching from an old like is not a new reaction: no notification.
        assert.equal(s.notifications.length, 0);
    } finally { s.restore(); }
});

test("post reaction list: hidden posts and invalid filters fail; visible list is filtered and paged", async () => {
    const s = stubs();
    const post = fakePost({
        reactions: [{ userId: ME, reaction: "love" }, { userId: AUTHOR, reaction: "wow" }, { userId: "64b000000000000000000003", reaction: "sad" }],
        likes: ["64b000000000000000000004"],
    });
    Post.findOne = async () => post;
    const people = [
        { _id: ME, username: "me", profilePicture: "me.png", blockList: [] },
        { _id: AUTHOR, username: "author", profilePicture: "author.png", blockList: [] },
        { _id: "64b000000000000000000003", username: "locked", isLocked: true, blockList: [] },
        { _id: "64b000000000000000000004", username: "blocked-by-me", blockList: [] },
    ];
    User.find = () => ({ select: async () => people });
    const request = (query = {}) => getPostReactions({ params: { id: POST_ID }, query, user: { _id: ME, blockList: ["64b000000000000000000004"], friend: [] } }, response());
    try {
        Post.findOne = async () => fakePost({ privacy: "private" });
        assert.equal((await request()).statusCode, 404);
        Post.findOne = async () => post;
        assert.equal((await request({ type: "nope" })).statusCode, 400);
        const res = await request({ page: "1", limit: "1" });
        assert.equal(res.statusCode, 200);
        assert.deepEqual(res.body.counts, { like: 0, love: 1, haha: 0, wow: 1, sad: 0, angry: 0 });
        assert.equal(res.body.total, 2);
        assert.equal(res.body.items[0].user.username, "me");
        assert.deepEqual(Object.keys(res.body.items[0].user).sort(), ["_id", "profilePicture", "username"]);
    } finally { s.restore(); }
});

test("post: no notification for your own post; blocked or private posts are not reactable", async () => {
    const s = stubs();
    try {
        Post.findOne = async () => fakePost({ authorId: ME });
        let res = await call(reactToPost, "PUT", "like");
        assert.equal(res.statusCode, 200);
        assert.equal(s.notifications.length, 0);

        Post.findOne = async () => fakePost({ privacy: "private" });
        res = await call(reactToPost, "PUT", "like");
        assert.equal(res.statusCode, 404);

        Post.findOne = async () => fakePost();
        User.findById = () => ({ select: async () => ({ _id: AUTHOR, blockList: [ME] }) });
        res = await call(reactToPost, "PUT", "like");
        assert.equal(res.statusCode, 404);

        Post.findOne = async () => null;
        res = await call(reactToPost, "PUT", "like");
        assert.equal(res.statusCode, 404);
    } finally { s.restore(); }
});

test("comment: react, switch and remove; the comment author is notified", async () => {
    const s = stubs();
    const comment = { _id: COMMENT_ID, authorId: AUTHOR, postId: POST_ID, reactions: [], async save() {} };
    Comment.findOne = async () => comment;
    Post.findOne = async () => fakePost();
    try {
        let res = await call(reactToComment, "PUT", "haha", { params: { id: COMMENT_ID } });
        assert.equal(res.statusCode, 200);
        assert.deepEqual(comment.reactions, [{ userId: ME, reaction: "haha" }]);
        assert.equal(s.notifications.length, 1);
        assert.equal(s.notifications[0].commentId, COMMENT_ID);

        res = await call(reactToComment, "PUT", "sad", { params: { id: COMMENT_ID } });
        assert.deepEqual(comment.reactions, [{ userId: ME, reaction: "sad" }]);

        res = await call(reactToComment, "DELETE", null, { params: { id: COMMENT_ID } });
        assert.deepEqual(comment.reactions, []);

        res = await call(reactToComment, "PUT", "nope", { params: { id: COMMENT_ID } });
        assert.equal(res.statusCode, 400);
    } finally { s.restore(); }
});

test("message: reaction is pushed to both people instantly", async () => {
    const s = stubs();
    const emitted = [];
    setIO({ to(room) { return { emit(event, payload) { emitted.push({ room, event, payload }); } }; } });
    const message = { _id: MESSAGE_ID, conversationId: CONVERSATION_ID, reactions: [], async save() {} };
    Conversation.findById = async () => ({ _id: CONVERSATION_ID, participants: [ME, AUTHOR], hiddenFor: [] });
    Message.findOne = async () => message;
    const params = { conversationId: CONVERSATION_ID, messageId: MESSAGE_ID };
    try {
        let res = await call(reactToMessage, "PUT", "love", { params });
        assert.equal(res.statusCode, 200);
        assert.deepEqual(message.reactions, [{ userId: ME, reaction: "love" }]);
        assert.deepEqual(emitted.map((item) => [item.room, item.event]), [
            [`user:${AUTHOR}`, "message:reaction"],
            [`user:${ME}`, "message:reaction"],
        ]);
        assert.equal(emitted[0].payload.messageId, MESSAGE_ID);

        // Not a participant: 404, and nothing is pushed.
        emitted.length = 0;
        Conversation.findById = async () => ({ _id: CONVERSATION_ID, participants: [AUTHOR, "x"], hiddenFor: [] });
        res = await call(reactToMessage, "PUT", "love", { params });
        assert.equal(res.statusCode, 404);
        assert.equal(emitted.length, 0);

        // Blocked: 403.
        Conversation.findById = async () => ({ _id: CONVERSATION_ID, participants: [ME, AUTHOR], hiddenFor: [] });
        User.findById = () => ({ select: async () => ({ _id: AUTHOR, blockList: [ME] }) });
        res = await call(reactToMessage, "PUT", "love", { params });
        assert.equal(res.statusCode, 403);
    } finally { s.restore(); }
});
