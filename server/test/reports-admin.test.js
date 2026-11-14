const test = require("node:test");
const assert = require("node:assert/strict");
const Report = require("../models/Report");
const Post = require("../models/Post");
const User = require("../models/User");
const { createReport } = require("../controllers/reportControllers");
const { lockUser, updateReport } = require("../controllers/adminControllers");

function response() {
    return {
        statusCode: 200,
        body: null,
        status(code) { this.statusCode = code; return this; },
        json(body) { this.body = body; return this; },
    };
}

test("report submission validates an active target and handles duplicates", async () => {
    const originalTargetFind = Post.findOne;
    const originalCreate = Report.create;
    Post.findOne = async () => ({ _id: "post1" });
    Report.create = async () => { const error = new Error("duplicate"); error.code = 11000; throw error; };
    try {
        const res = response();
        await createReport({ body: { targetType: "post", targetId: "post1", reason: "spam" }, user: { _id: "reporter" } }, res);
        assert.equal(res.statusCode, 409);
    } finally {
        Post.findOne = originalTargetFind;
        Report.create = originalCreate;
    }
});

test("admin actions lock users and record report reviewer", async () => {
    const originalUserFind = User.findById;
    const originalReportFind = Report.findById;
    const user = { _id: "target", username: "target", isAdmin: false, save: async () => {} };
    const report = { _id: "report", save: async () => {} };
    User.findById = async () => user;
    Report.findById = async () => report;
    try {
        const lockRes = response();
        await lockUser({ params: { userId: "target" } }, lockRes);
        assert.equal(lockRes.statusCode, 200);
        assert.equal(user.isLocked, true);

        const reportRes = response();
        await updateReport({ params: { reportId: "report" }, body: { status: "reviewed" }, user: { _id: "admin" } }, reportRes);
        assert.equal(reportRes.statusCode, 200);
        assert.equal(report.status, "reviewed");
        assert.equal(report.reviewedBy, "admin");
    } finally {
        User.findById = originalUserFind;
        Report.findById = originalReportFind;
    }
});
