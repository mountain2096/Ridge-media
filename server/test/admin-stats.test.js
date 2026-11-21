const test = require("node:test");
const assert = require("node:assert/strict");
const User = require("../models/User");
const Post = require("../models/Post");
const Report = require("../models/Report");
const { getStats } = require("../controllers/adminControllers");

function response() {
    return {
        statusCode: 200,
        body: null,
        status(code) { this.statusCode = code; return this; },
        json(body) { this.body = body; return this; },
    };
}

test("admin stats rejects an unsupported range", async () => {
    const res = response();
    await getStats({ query: { days: "10" } }, res);
    assert.equal(res.statusCode, 400);
});

test("admin stats returns zero-filled daily series and totals", async () => {
    const original = {
        userAggregate: User.aggregate, postAggregate: Post.aggregate, reportAggregate: Report.aggregate,
        userCount: User.countDocuments, postCount: Post.countDocuments, reportCount: Report.countDocuments,
    };
    const today = new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const postPipelines = [];
    User.aggregate = async () => [{ _id: today, count: 3 }];
    Post.aggregate = async (pipeline) => { postPipelines.push(pipeline); return []; };
    Report.aggregate = async () => [{ _id: today, count: 2 }];
    User.countDocuments = async (filter) => (filter && filter.isLocked ? 1 : 10);
    Post.countDocuments = async () => 25;
    Report.countDocuments = async () => 2;
    try {
        const res = response();
        await getStats({ query: { days: "7" } }, res);
        assert.equal(res.statusCode, 200);
        assert.equal(res.body.range.days, 7);
        assert.equal(res.body.range.to, today);
        assert.equal(res.body.series.users.length, 7);
        assert.deepEqual(res.body.series.users.at(-1), { date: today, count: 3 });
        assert.equal(res.body.series.users[0].count, 0);
        assert.equal(res.body.series.posts.every((point) => point.count === 0), true);
        assert.deepEqual(res.body.series.reports.at(-1), { date: today, count: 2 });
        assert.deepEqual(res.body.totals, { users: 10, lockedUsers: 1, activePosts: 25, pendingReports: 2 });
        // Deleted posts must not be counted as new posts.
        assert.deepEqual(postPipelines[0][0].$match.status, { $ne: "deleted" });
    } finally {
        User.aggregate = original.userAggregate;
        Post.aggregate = original.postAggregate;
        Report.aggregate = original.reportAggregate;
        User.countDocuments = original.userCount;
        Post.countDocuments = original.postCount;
        Report.countDocuments = original.reportCount;
    }
});
