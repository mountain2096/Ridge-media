const test = require("node:test");
const assert = require("node:assert/strict");
const Report = require("../models/Report");
const Post = require("../models/Post");
const Comment = require("../models/Comment");
const User = require("../models/User");
const { listPriorityReports } = require("../controllers/moderationControllers");
const { buildDemoData, DEMO_DOMAIN } = require("../scripts/demo-data");

function build() {
    let counter = 0;
    const now = Date.now();
    return { now, data: buildDemoData({ now, newId: () => `id${++counter}` }) };
}

test("demo data is internally consistent", () => {
    const { now, data } = build();
    const userById = new Map(data.users.map((user) => [user._id, user]));
    const postById = new Map(data.posts.map((post) => [post._id, post]));
    const commentById = new Map(data.comments.map((comment) => [comment._id, comment]));

    assert.equal(new Set(data.users.map((user) => user.username)).size, data.users.length);
    assert.ok(data.users.every((user) => user.email === `${user.username}@${DEMO_DOMAIN}`));
    assert.equal(data.users.filter((user) => user.isAdmin).length, 1);

    // Friends are mutual and nobody is their own friend.
    for (const user of data.users) {
        assert.ok(!user.friend.includes(user._id));
        for (const friendId of user.friend) assert.ok(userById.get(friendId).friend.includes(user._id));
    }

    for (const post of data.posts) {
        assert.ok(userById.has(post.authorId));
        assert.ok(post.content.length > 0 && post.content.length <= 500);
        assert.ok(post.createdAt.getTime() <= now);
        assert.ok(post.createdAt >= userById.get(post.authorId).createdAt, "post written before its author joined");
        if (post.originalPostId) assert.ok(postById.get(post.originalPostId).createdAt <= post.createdAt);
    }
    for (const comment of data.comments) {
        assert.ok(userById.has(comment.authorId));
        assert.ok(comment.content.length <= 500);
        assert.ok(comment.createdAt >= postById.get(comment.postId).createdAt, "comment older than its post");
        assert.ok(comment.createdAt >= userById.get(comment.authorId).createdAt);
        assert.ok(comment.createdAt.getTime() <= now);
    }

    const seen = new Set();
    for (const report of data.reports) {
        const key = `${report.reporterId}:${report.targetType}:${report.targetId}`;
        assert.ok(!seen.has(key), "duplicate report (the unique index would reject it)");
        seen.add(key);
        const target = report.targetType === "post" ? postById.get(report.targetId) : commentById.get(report.targetId);
        assert.ok(target, "report points to a missing target");
        assert.notEqual(target.authorId, report.reporterId, "someone reports their own content");
        assert.ok(report.createdAt >= target.createdAt, "report older than its target");
        assert.ok(report.createdAt >= userById.get(report.reporterId).createdAt);
        assert.ok(report.createdAt.getTime() <= now);
        if (report.status === "pending") {
            assert.equal(report.reviewedBy, null);
        } else {
            assert.ok(report.reviewedBy && report.reviewedAt >= report.createdAt);
        }
    }

    const messageIds = new Set(data.messages.map((message) => message._id));
    for (const conversation of data.conversations) {
        assert.equal(conversation.participants.length, 2);
        assert.ok(messageIds.has(conversation.lastMessage));
    }
    for (const message of data.messages) {
        assert.ok(message.content.length <= 2000);
        assert.ok(message.createdAt.getTime() <= now);
    }
    assert.ok(data.notifications.some((notification) => !notification.isRead), "the bell should start with unread items");
});

test("demo data fills every chart and the whole moderation queue", () => {
    const { now, data } = build();
    const daysAgo = (date) => Math.floor((now - date.getTime()) / 86400000);
    const activeDays = (list) => new Set(list.map((item) => daysAgo(item.createdAt)).filter((day) => day < 14));
    // Charts show 14 days by default: enough days with data to look like a real trend.
    assert.ok(activeDays(data.posts).size >= 7);
    assert.ok(activeDays(data.reports).size >= 5);
    assert.ok(activeDays(data.users).size >= 5);
    assert.ok(data.users.some((user) => user.isLocked));
    assert.ok(data.posts.some((post) => post.status === "deleted"));
    assert.ok(data.posts.some((post) => post.originalPostId));
});

// Rows of a stubbed collection that match { field: { $in: [...] } } style filters.
function matches(row, filter) {
    return Object.entries(filter).every(([field, condition]) => {
        if (field === "$or") return condition.some((part) => matches(row, part));
        if (condition && typeof condition === "object" && "$in" in condition) {
            return condition.$in.map(String).includes(String(row[field]));
        }
        return String(row[field]) === String(condition);
    });
}

function query(rows) {
    return {
        sort() { return this; }, limit() { return this; }, populate() { return this; },
        select() { return this; }, lean() { return this; },
        then(resolve, reject) { return Promise.resolve(rows).then(resolve, reject); },
    };
}

test("the demo reports produce the planned priority queue", async () => {
    const { data } = build();
    const original = { report: Report.find, post: Post.find, comment: Comment.find, user: User.find };
    const nameOf = new Map(data.users.map((user) => [user._id, user.username]));
    Report.find = (filter) => {
        if (filter.status === "pending") {
            const rows = data.reports.filter((report) => report.status === "pending")
                .map((report) => ({ ...report, reporterId: { username: nameOf.get(report.reporterId) } }));
            return query(rows);
        }
        return query(data.reports.filter((report) => matches(report, filter)));
    };
    Post.find = (filter) => query(data.posts.filter((post) => matches(post, filter)));
    Comment.find = (filter) => query(data.comments.filter((comment) => matches(comment, filter)));
    User.find = (filter) => query(data.users.filter((user) => matches(user, filter)));
    try {
        const res = { statusCode: 200, body: null, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
        await listPriorityReports({}, res);
        assert.equal(res.statusCode, 200);
        const { items, summary } = res.body;
        assert.deepEqual(summary, { total: 7, high: 2, medium: 3, low: 2 });

        const find = (text) => items.find((item) => item.target.content.startsWith(text));
        const threat = find("Thằng nào còn nói xấu");
        const abusiveComment = find("Viết dở ẹc");
        assert.equal(items[0], threat, "the threat should be first");
        assert.equal(items[1], abusiveComment, "the abusive comment should be second");
        assert.equal(threat.level, "high");
        assert.equal(abusiveComment.level, "high");
        assert.equal(abusiveComment.targetType, "comment");
        assert.equal(find("Hôm nay mà còn trễ deadline").level, "medium");
        assert.equal(find("Uống nước chanh").level, "medium");
        assert.equal(find("Kiếm 20 triệu").level, "medium");
        assert.equal(find("Mua sách giảm 50%").level, "low");
        assert.equal(find("Mua follow giá rẻ").level, "low");
        // The repeat offender's history is what lifts his spam post above the other spam items.
        assert.deepEqual(find("Kiếm 20 triệu").authorHistory, { reportedOther: 3, actionedOther: 1 });
    } finally {
        Report.find = original.report;
        Post.find = original.post;
        Comment.find = original.comment;
        User.find = original.user;
    }
});

test("demo data has reactions of all six kinds on posts, comments and messages, and some saved posts", () => {
    const { data } = build();
    const kinds = new Set(["like", "love", "haha", "wow", "sad", "angry"]);
    const userIds = new Set(data.users.map((user) => user._id));
    const seen = { posts: new Set(), comments: new Set(), messages: new Set() };

    const check = (name, items) => {
        for (const item of items) {
            const reactors = (item.reactions || []).map((entry) => entry.userId);
            assert.equal(new Set(reactors).size, reactors.length, `${name}: one reaction per user`);
            for (const entry of item.reactions || []) {
                assert.ok(kinds.has(entry.reaction), `${name}: unknown reaction ${entry.reaction}`);
                assert.ok(userIds.has(entry.userId));
                assert.notEqual(entry.userId, item.authorId || item.senderId, `${name}: nobody reacts to their own item`);
                seen[name].add(entry.reaction);
            }
        }
    };
    check("posts", data.posts);
    check("comments", data.comments);
    check("messages", data.messages);

    // For posts, `likes` lists exactly the people who reacted.
    for (const post of data.posts) {
        assert.deepEqual([...post.likes].sort(), post.reactions.map((entry) => entry.userId).sort());
    }
    assert.deepEqual([...seen.posts].sort(), [...kinds].sort());
    assert.ok(seen.comments.size >= 3, "comments show several kinds");
    assert.ok(seen.messages.size >= 2, "messages show several kinds");

    const presenter = data.users.find((user) => user.username === "minh_anh");
    const activePostIds = new Set(data.posts.filter((post) => post.status === "active").map((post) => post._id));
    assert.ok(presenter.savedPosts.length >= 2);
    assert.ok(presenter.savedPosts.every((postId) => activePostIds.has(postId)));
});

test("demo data has replies and mentions that follow the rules", () => {
    const { data } = build();
    const userIds = new Set(data.users.map((user) => user._id));
    const commentById = new Map(data.comments.map((comment) => [comment._id, comment]));
    const replies = data.comments.filter((comment) => comment.parentId);

    assert.ok(replies.length >= 2, "there are replies to show");
    for (const reply of replies) {
        const parent = commentById.get(reply.parentId);
        assert.ok(parent, "reply points to an existing comment");
        assert.equal(parent.parentId, null, "replies are one level deep");
        assert.equal(parent.postId, reply.postId, "reply is on the same post as its parent");
        assert.ok(parent.createdAt <= reply.createdAt, "reply is newer than its parent");
    }
    const mentioning = data.comments.filter((comment) => comment.mentions.length);
    assert.ok(mentioning.length >= 2, "there are comments with @mentions");
    for (const comment of mentioning) {
        for (const userId of comment.mentions) {
            assert.ok(userIds.has(userId));
            const username = data.users.find((user) => user._id === userId).username;
            assert.ok(comment.content.includes(`@${username}`), "the mention appears in the text");
        }
    }
    const kinds = new Set(data.notifications.map((item) => item.type));
    assert.ok(kinds.has("reply") && kinds.has("mention"));
});
