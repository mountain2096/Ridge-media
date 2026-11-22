const test = require("node:test");
const assert = require("node:assert/strict");

const Post = require("../models/Post");
const Comment = require("../models/Comment");
const User = require("../models/User");
const Notification = require("../models/Notification");
const { createComment, deleteComment } = require("../controllers/commentControllers");
const { extractMentionUsernames } = require("../utils/mentions");

const ME = "64b000000000000000000001";
const POST_AUTHOR = "64b000000000000000000002";
const PARENT_AUTHOR = "64b000000000000000000003";
const POST_ID = "64b0000000000000000000a1";
const ROOT_ID = "64b0000000000000000000b1";
const REPLY_ID = "64b0000000000000000000b2";

function response() {
    return {
        statusCode: 200, body: null,
        status(code) { this.statusCode = code; return this; },
        json(body) { this.body = body; return this; },
    };
}

function setup({ users = [] } = {}) {
    const original = {
        postFind: Post.findOne, commentFind: Comment.findOne, commentCreate: Comment.create,
        commentUpdateMany: Comment.updateMany, userFind: User.find, notificationCreate: Notification.create,
        userFindById: User.findById,
    };
    const created = [];
    const notifications = [];
    Post.findOne = async () => ({ _id: POST_ID, id: POST_ID, authorId: POST_AUTHOR, privacy: "public" });
    Comment.create = async (data) => { created.push(data); return { _id: "new1", id: "new1", ...data }; };
    Comment.updateMany = async () => ({ modifiedCount: 0 });
    Notification.create = async (data) => { notifications.push(data); return data; };
    User.find = () => ({ select: async () => users });
    User.findById = () => ({ select: async () => ({ _id: POST_AUTHOR, blockList: [] }) });
    return {
        created, notifications,
        restore() {
            Post.findOne = original.postFind; Comment.findOne = original.commentFind; Comment.create = original.commentCreate;
            Comment.updateMany = original.commentUpdateMany; User.find = original.userFind; Notification.create = original.notificationCreate;
            User.findById = original.userFindById;
        },
    };
}

const post = (body, extra = {}) => {
    const res = response();
    return createComment({ params: { postId: POST_ID }, body, user: { _id: ME, blockList: [] }, ...extra }, res).then(() => res);
};

test("extractMentionUsernames finds unique @names and ignores e-mail addresses", () => {
    assert.deepEqual(extractMentionUsernames("@hoang_nam xem giúp, cả @minh_anh nữa. @hoang_nam"), ["hoang_nam", "minh_anh"]);
    assert.deepEqual(extractMentionUsernames("hỏi a@b.com thử"), []);
    assert.deepEqual(extractMentionUsernames("cảm ơn @thu_trang."), ["thu_trang"]);
    assert.deepEqual(extractMentionUsernames("@a không đủ dài"), []);
    assert.deepEqual(extractMentionUsernames(null), []);
    assert.equal(extractMentionUsernames("@u1x @u2x @u3x @u4x @u5x @u6x @u7x").length, 5);
});

test("plain comment keeps working: top-level, notifies the post author once", async () => {
    const s = setup();
    try {
        const res = await post({ content: "  xin chào  " });
        assert.equal(res.statusCode, 200);
        assert.equal(s.created[0].content, "xin chào");
        assert.equal(s.created[0].parentId, null);
        assert.deepEqual(s.created[0].mentions, []);
        assert.deepEqual(s.notifications.map((item) => [item.recipientId, item.type]), [[POST_AUTHOR, "comment"]]);
    } finally { s.restore(); }
});

test("reply: attaches to the top-level comment and notifies the parent author with 'reply'", async () => {
    const s = setup();
    Comment.findOne = async () => ({ _id: REPLY_ID, authorId: PARENT_AUTHOR, postId: POST_ID, parentId: ROOT_ID });
    try {
        // Replying to a reply flattens to the root comment.
        const res = await post({ content: "đồng ý", parentId: REPLY_ID });
        assert.equal(res.statusCode, 200);
        assert.equal(s.created[0].parentId, ROOT_ID);
        assert.deepEqual(s.notifications.map((item) => [item.recipientId, item.type]), [
            [PARENT_AUTHOR, "reply"],
            [POST_AUTHOR, "comment"],
        ]);
    } finally { s.restore(); }
});

test("reply validation: bad id and missing parent are rejected", async () => {
    const s = setup();
    try {
        let res = await post({ content: "x", parentId: "not-an-id" });
        assert.equal(res.statusCode, 400);
        Comment.findOne = async () => null;
        res = await post({ content: "x", parentId: ROOT_ID });
        assert.equal(res.statusCode, 400);
        assert.equal(s.created.length, 0);
    } finally { s.restore(); }
});

test("mentions: saved on the comment, one 'mention' notification each, no duplicates, none for self or blocked", async () => {
    const mentioned = [
        { _id: "64b000000000000000000010", username: "an_binh", blockList: [], friend: [] },
        { _id: POST_AUTHOR, username: "chu_bai", blockList: [], friend: [] },
        { _id: ME, username: "me", blockList: [], friend: [] },
        { _id: "64b000000000000000000011", username: "da_chan", blockList: [ME], friend: [] },
    ];
    const s = setup({ users: mentioned });
    try {
        const res = await post({ content: "@an_binh @chu_bai @me @da_chan xem thử" });
        assert.equal(res.statusCode, 200);
        assert.deepEqual(s.created[0].mentions, ["64b000000000000000000010", POST_AUTHOR]);
        // The post author already gets "comment", so no second notification for them.
        assert.deepEqual(s.notifications.map((item) => [item.recipientId, item.type]), [
            [POST_AUTHOR, "comment"],
            ["64b000000000000000000010", "mention"],
        ]);
    } finally { s.restore(); }
});

test("mentions respect privacy: friends-only post only reaches friends of the author", async () => {
    const s = setup({ users: [
        { _id: "64b000000000000000000010", username: "ban_be", blockList: [], friend: [POST_AUTHOR] },
        { _id: "64b000000000000000000011", username: "nguoi_la", blockList: [], friend: [] },
    ] });
    Post.findOne = async () => ({ _id: POST_ID, id: POST_ID, authorId: POST_AUTHOR, privacy: "friends" });
    try {
        await post({ content: "@ban_be @nguoi_la" }, { user: { _id: ME, blockList: [], friend: [POST_AUTHOR] } });
        assert.deepEqual(s.created[0].mentions, ["64b000000000000000000010"]);
    } finally { s.restore(); }
});

test("deleting a top-level comment also deletes its replies and reports how many were removed", async () => {
    const s = setup();
    let updateFilter = null;
    Comment.updateMany = async (filter) => { updateFilter = filter; return { modifiedCount: 2 }; };
    const root = { _id: ROOT_ID, authorId: ME, postId: POST_ID, parentId: null, status: "active", async save() {} };
    Comment.findOne = async () => root;
    Post.findById = async () => ({ authorId: POST_AUTHOR });
    try {
        const res = response();
        await deleteComment({ params: { id: ROOT_ID }, user: { _id: ME } }, res);
        assert.equal(res.statusCode, 200);
        assert.equal(root.status, "deleted");
        assert.equal(updateFilter.parentId, ROOT_ID);
        assert.equal(res.body.removed, 3);

        // Deleting a reply removes only that reply.
        updateFilter = null;
        const reply = { _id: REPLY_ID, authorId: ME, postId: POST_ID, parentId: ROOT_ID, status: "active", async save() {} };
        Comment.findOne = async () => reply;
        const res2 = response();
        await deleteComment({ params: { id: REPLY_ID }, user: { _id: ME } }, res2);
        assert.equal(updateFilter, null);
        assert.equal(res2.body.removed, 1);
    } finally { s.restore(); }
});
