const Report = require("../models/Report");
const Post = require("../models/Post");
const Comment = require("../models/Comment");
const User = require("../models/User");
const errorResponse = require("../utils/errorResponse");
const { POINTS, LEVEL_THRESHOLDS, REASON_LABELS, scoreTarget } = require("../utils/reportPriority");

const MAX_PENDING_REPORTS = 1000;
const MAX_QUEUE_ITEMS = 100;
const SNIPPET_LENGTH = 200;

const keyOf = (type, id) => `${type}:${id}`;
const snippet = (text = "") => (text.length > SNIPPET_LENGTH ? `${text.slice(0, SNIPPET_LENGTH)}…` : text);

// UC24: pending reports grouped per post/comment and sorted by a rule-based priority score.
const listPriorityReports = async (req, res) => {
    try {
        const now = new Date();
        const pending = await Report.find({ status: "pending" })
            .sort({ createdAt: -1 }).limit(MAX_PENDING_REPORTS)
            .populate("reporterId", "username").lean();

        const groups = new Map();
        for (const report of pending) {
            const key = keyOf(report.targetType, report.targetId);
            if (!groups.has(key)) {
                groups.set(key, { targetType: report.targetType, targetId: String(report.targetId), reports: [] });
            }
            groups.get(key).reports.push(report);
        }

        const scoring = { points: POINTS, thresholds: LEVEL_THRESHOLDS };
        if (groups.size === 0) {
            return res.status(200).json({
                generatedAt: now, items: [], summary: { total: 0, high: 0, medium: 0, low: 0 }, truncated: false, scoring,
            });
        }

        const idsOf = (type) => [...groups.values()].filter((group) => group.targetType === type).map((group) => group.targetId);
        const [posts, comments] = await Promise.all([
            Post.find({ _id: { $in: idsOf("post") } }).select("authorId content image video status").lean(),
            Comment.find({ _id: { $in: idsOf("comment") } }).select("authorId content status").lean(),
        ]);
        const targets = new Map();
        posts.forEach((post) => targets.set(keyOf("post", post._id), post));
        comments.forEach((comment) => targets.set(keyOf("comment", comment._id), comment));

        // History of each author: which of THEIR posts/comments were reported, and which were actioned.
        const authorIds = [...new Set([...targets.values()].map((target) => String(target.authorId)))];
        const [authors, authorPosts, authorComments] = authorIds.length === 0 ? [[], [], []] : await Promise.all([
            User.find({ _id: { $in: authorIds } }).select("username").lean(),
            Post.find({ authorId: { $in: authorIds } }).select("authorId").lean(),
            Comment.find({ authorId: { $in: authorIds } }).select("authorId").lean(),
        ]);
        const usernames = new Map(authors.map((author) => [String(author._id), author.username]));
        const authorOfTarget = new Map();
        authorPosts.forEach((post) => authorOfTarget.set(keyOf("post", post._id), String(post.authorId)));
        authorComments.forEach((comment) => authorOfTarget.set(keyOf("comment", comment._id), String(comment.authorId)));

        const historyReports = authorOfTarget.size === 0 ? [] : await Report.find({
            $or: [
                { targetType: "post", targetId: { $in: authorPosts.map((post) => post._id) } },
                { targetType: "comment", targetId: { $in: authorComments.map((comment) => comment._id) } },
            ],
        }).select("targetType targetId status").lean();

        // authorId -> (targetKey -> true when at least one report on it was actioned)
        const reportedByAuthor = new Map();
        for (const report of historyReports) {
            const key = keyOf(report.targetType, report.targetId);
            const authorId = authorOfTarget.get(key);
            if (!authorId) continue;
            if (!reportedByAuthor.has(authorId)) reportedByAuthor.set(authorId, new Map());
            const reported = reportedByAuthor.get(authorId);
            reported.set(key, reported.get(key) || report.status === "actioned");
        }

        const items = [...groups.entries()].map(([key, group]) => {
            const target = targets.get(key);
            const authorId = target ? String(target.authorId) : null;

            let reportedOther = 0;
            let actionedOther = 0;
            if (authorId && reportedByAuthor.has(authorId)) {
                for (const [otherKey, actioned] of reportedByAuthor.get(authorId)) {
                    if (otherKey === key) continue;
                    reportedOther += 1;
                    if (actioned) actionedOther += 1;
                }
            }
            const authorHistory = { reportedOther, actionedOther };

            const { score, level, breakdown } = scoreTarget({ reports: group.reports, authorHistory, now });
            const reports = [...group.reports].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            const reasonCounts = {};
            reports.forEach((report) => { reasonCounts[report.reason] = (reasonCounts[report.reason] || 0) + 1; });
            const available = Boolean(target) && target.status === "active";

            return {
                targetType: group.targetType,
                targetId: group.targetId,
                score,
                level,
                breakdown,
                authorHistory,
                reportCount: reports.length,
                firstReportedAt: reports[reports.length - 1].createdAt,
                lastReportedAt: reports[0].createdAt,
                reasons: Object.entries(reasonCounts).map(([reason, count]) => ({ reason, label: REASON_LABELS[reason] || reason, count })),
                author: authorId ? { id: authorId, username: usernames.get(authorId) || "" } : null,
                target: {
                    available,
                    content: available ? snippet(target.content) : "",
                    hasMedia: available && Boolean(target.image || target.video),
                },
                reports: reports.map((report) => ({
                    _id: report._id,
                    reason: report.reason,
                    reasonLabel: REASON_LABELS[report.reason] || report.reason,
                    description: report.description || "",
                    createdAt: report.createdAt,
                    reporter: report.reporterId?.username || "",
                })),
            };
        });

        items.sort((a, b) => b.score - a.score || new Date(b.lastReportedAt) - new Date(a.lastReportedAt));
        const summary = { total: items.length, high: 0, medium: 0, low: 0 };
        items.forEach((item) => { summary[item.level] += 1; });

        return res.status(200).json({
            generatedAt: now,
            items: items.slice(0, MAX_QUEUE_ITEMS),
            summary,
            truncated: pending.length >= MAX_PENDING_REPORTS || items.length > MAX_QUEUE_ITEMS,
            scoring,
        });
    } catch (error) {
        return errorResponse(res, error);
    }
};

// UC21: mark all pending reports of one post/comment as reviewed or actioned in one step.
// "actioned" only records the decision; it does not delete or hide the content.
const resolveTargetReports = async (req, res) => {
    try {
        const { targetType, targetId } = req.params;
        const { status } = req.body ?? {};
        if (!["post", "comment"].includes(targetType)) {
            return res.status(400).json({ message: "Loại nội dung không hợp lệ!" });
        }
        if (!["reviewed", "actioned"].includes(status)) {
            return res.status(400).json({ message: "Trạng thái xử lý báo cáo không hợp lệ!" });
        }
        const result = await Report.updateMany(
            { targetType, targetId, status: "pending" },
            { $set: { status, reviewedBy: req.user._id, reviewedAt: new Date() } },
        );
        if (result.matchedCount === 0) {
            return res.status(404).json({ message: "Không có báo cáo đang chờ cho nội dung này!" });
        }
        return res.status(200).json({ message: "Đã cập nhật báo cáo!", updated: result.modifiedCount });
    } catch (error) {
        if (error.name === "CastError") return res.status(400).json({ message: "ID nội dung không hợp lệ!" });
        return errorResponse(res, error);
    }
};

module.exports = { listPriorityReports, resolveTargetReports };
