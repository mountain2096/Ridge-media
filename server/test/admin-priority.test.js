const test = require("node:test");
const assert = require("node:assert/strict");
const Report = require("../models/Report");
const Post = require("../models/Post");
const Comment = require("../models/Comment");
const User = require("../models/User");
const { listPriorityReports, resolveTargetReports } = require("../controllers/moderationControllers");

function response() {
    return {
        statusCode: 200,
        body: null,
        status(code) { this.statusCode = code; return this; },
        json(body) { this.body = body; return this; },
    };
}

// A stand-in for a Mongoose query: every chain method returns itself and awaiting gives the rows.
function query(rows) {
    return {
        sort() { return this; }, limit() { return this; }, populate() { return this; },
        select() { return this; }, lean() { return this; },
        then(resolve, reject) { return Promise.resolve(rows).then(resolve, reject); },
    };
}

const hoursAgo = (hours) => new Date(Date.now() - hours * 3600 * 1000);

test("priority queue groups reports per target, scores them and sorts by score", async () => {
    const original = {
        reportFind: Report.find, postFind: Post.find, commentFind: Comment.find, userFind: User.find,
    };
    const reportedCall = { count: 0 };
    // post p1: three reporters, violence, fresh; author a1 also has an older actioned post p0.
    // post p2: one old spam report; author a2 has no history.
    const pending = [
        { _id: "r1", reporterId: { username: "u1" }, targetType: "post", targetId: "p1", reason: "violence", description: "bad", createdAt: hoursAgo(1) },
        { _id: "r2", reporterId: { username: "u2" }, targetType: "post", targetId: "p1", reason: "spam", description: "", createdAt: hoursAgo(2) },
        { _id: "r3", reporterId: { username: "u3" }, targetType: "post", targetId: "p1", reason: "violence", description: "", createdAt: hoursAgo(3) },
        { _id: "r4", reporterId: { username: "u4" }, targetType: "post", targetId: "p2", reason: "spam", description: "", createdAt: hoursAgo(100) },
    ];
    Report.find = (filter) => {
        if (filter.status === "pending") return query(pending);
        reportedCall.count += 1;
        // History lookup: p0 (author a1) was reported and actioned, p1/p2 are the pending ones.
        return query([
            { targetType: "post", targetId: "p0", status: "actioned" },
            { targetType: "post", targetId: "p1", status: "pending" },
            { targetType: "post", targetId: "p2", status: "pending" },
        ]);
    };
    Post.find = (filter) => {
        if (filter._id) {
            return query([
                { _id: "p1", authorId: "a1", content: "post one", status: "active" },
                { _id: "p2", authorId: "a2", content: "post two", status: "active" },
            ]);
        }
        return query([
            { _id: "p0", authorId: "a1" }, { _id: "p1", authorId: "a1" }, { _id: "p2", authorId: "a2" },
        ]);
    };
    Comment.find = () => query([]);
    User.find = () => query([{ _id: "a1", username: "alice" }, { _id: "a2", username: "bob" }]);
    try {
        const res = response();
        await listPriorityReports({}, res);
        assert.equal(res.statusCode, 200);
        assert.equal(res.body.items.length, 2);
        const [first, second] = res.body.items;
        assert.equal(first.targetId, "p1");
        assert.equal(first.reportCount, 3);
        assert.equal(first.author.username, "alice");
        // The author's other post p0 was reported and actioned: 1 reported + 1 actioned.
        assert.deepEqual(first.authorHistory, { reportedOther: 1, actionedOther: 1 });
        assert.equal(first.level, "high");
        assert.equal(first.breakdown.length, 4);
        assert.deepEqual(first.reasons.find((item) => item.reason === "violence").count, 2);
        assert.equal(first.reports[0].reporter, "u1");
        assert.equal(second.targetId, "p2");
        assert.equal(second.level, "low");
        assert.ok(first.score > second.score);
        assert.deepEqual(res.body.summary, { total: 2, high: 1, medium: 0, low: 1 });
        assert.equal(reportedCall.count, 1);
    } finally {
        Report.find = original.reportFind;
        Post.find = original.postFind;
        Comment.find = original.commentFind;
        User.find = original.userFind;
    }
});

test("priority queue is empty when nothing is pending", async () => {
    const originalFind = Report.find;
    Report.find = () => query([]);
    try {
        const res = response();
        await listPriorityReports({}, res);
        assert.equal(res.statusCode, 200);
        assert.deepEqual(res.body.items, []);
        assert.equal(res.body.summary.total, 0);
    } finally {
        Report.find = originalFind;
    }
});

test("reports of deleted content stay in the queue without content", async () => {
    const original = { reportFind: Report.find, postFind: Post.find };
    Report.find = () => query([
        { _id: "r1", reporterId: { username: "u1" }, targetType: "post", targetId: "gone", reason: "abuse", createdAt: hoursAgo(1) },
    ]);
    Post.find = () => query([]);
    const originalComment = Comment.find;
    Comment.find = () => query([]);
    try {
        const res = response();
        await listPriorityReports({}, res);
        assert.equal(res.body.items.length, 1);
        assert.equal(res.body.items[0].target.available, false);
        assert.equal(res.body.items[0].author, null);
    } finally {
        Report.find = original.reportFind;
        Post.find = original.postFind;
        Comment.find = originalComment;
    }
});

test("resolving a target updates all its pending reports and records the reviewer", async () => {
    const originalUpdateMany = Report.updateMany;
    let received = null;
    Report.updateMany = async (filter, update) => { received = { filter, update }; return { matchedCount: 3, modifiedCount: 3 }; };
    try {
        const res = response();
        await resolveTargetReports({ params: { targetType: "post", targetId: "p1" }, body: { status: "actioned" }, user: { _id: "admin" } }, res);
        assert.equal(res.statusCode, 200);
        assert.equal(res.body.updated, 3);
        assert.deepEqual(received.filter, { targetType: "post", targetId: "p1", status: "pending" });
        assert.equal(received.update.$set.status, "actioned");
        assert.equal(received.update.$set.reviewedBy, "admin");
    } finally {
        Report.updateMany = originalUpdateMany;
    }
});

test("resolving validates input and reports nothing-to-do", async () => {
    const originalUpdateMany = Report.updateMany;
    try {
        let res = response();
        await resolveTargetReports({ params: { targetType: "user", targetId: "x" }, body: { status: "reviewed" }, user: { _id: "admin" } }, res);
        assert.equal(res.statusCode, 400);

        res = response();
        await resolveTargetReports({ params: { targetType: "post", targetId: "x" }, body: { status: "pending" }, user: { _id: "admin" } }, res);
        assert.equal(res.statusCode, 400);

        res = response();
        await resolveTargetReports({ params: { targetType: "post", targetId: "x" }, user: { _id: "admin" } }, res);
        assert.equal(res.statusCode, 400);

        Report.updateMany = async () => ({ matchedCount: 0, modifiedCount: 0 });
        res = response();
        await resolveTargetReports({ params: { targetType: "post", targetId: "x" }, body: { status: "reviewed" }, user: { _id: "admin" } }, res);
        assert.equal(res.statusCode, 404);

        Report.updateMany = async () => { const error = new Error("cast"); error.name = "CastError"; throw error; };
        res = response();
        await resolveTargetReports({ params: { targetType: "post", targetId: "bad" }, body: { status: "reviewed" }, user: { _id: "admin" } }, res);
        assert.equal(res.statusCode, 400);
    } finally {
        Report.updateMany = originalUpdateMany;
    }
});
