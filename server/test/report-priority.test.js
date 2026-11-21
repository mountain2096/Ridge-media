const test = require("node:test");
const assert = require("node:assert/strict");
const { POINTS, scoreTarget, levelFor } = require("../utils/reportPriority");

const NOW = new Date("2026-11-22T12:00:00Z");
const hoursAgo = (hours) => new Date(NOW.getTime() - hours * 3600 * 1000);
const pointsOf = (result, key) => result.breakdown.find((part) => part.key === key).points;

test("the four parts add up to at most 100", () => {
    assert.equal(POINTS.reporters + POINTS.reason + POINTS.author + POINTS.recency, 100);
});

test("more different reporters give more points, capped at 5 reporters", () => {
    const make = (count) => Array.from({ length: count }, () => ({ reason: "spam", createdAt: hoursAgo(1) }));
    const one = pointsOf(scoreTarget({ reports: make(1), now: NOW }), "reporters");
    const three = pointsOf(scoreTarget({ reports: make(3), now: NOW }), "reporters");
    const five = pointsOf(scoreTarget({ reports: make(5), now: NOW }), "reporters");
    const nine = pointsOf(scoreTarget({ reports: make(9), now: NOW }), "reporters");
    assert.deepEqual([one, three, five, nine], [7, 21, 35, 35]);
});

test("reason part uses the most serious reason among the reports", () => {
    const result = scoreTarget({
        reports: [
            { reason: "spam", createdAt: hoursAgo(1) },
            { reason: "violence", createdAt: hoursAgo(2) },
        ],
        now: NOW,
    });
    assert.equal(pointsOf(result, "reason"), 30);
    assert.match(result.breakdown.find((part) => part.key === "reason").detail, /Bạo lực/);
    const spamOnly = scoreTarget({ reports: [{ reason: "spam", createdAt: hoursAgo(1) }], now: NOW });
    assert.equal(pointsOf(spamOnly, "reason"), 12);
});

test("author history: actioned items count twice and the part is capped", () => {
    const reports = [{ reason: "spam", createdAt: hoursAgo(1) }];
    const none = scoreTarget({ reports, now: NOW });
    const some = scoreTarget({ reports, authorHistory: { reportedOther: 1, actionedOther: 1 }, now: NOW });
    const many = scoreTarget({ reports, authorHistory: { reportedOther: 6, actionedOther: 3 }, now: NOW });
    assert.equal(pointsOf(none, "author"), 0);
    assert.equal(pointsOf(some, "author"), 10);
    assert.equal(pointsOf(many, "author"), 20);
});

test("freshness: full for 6 hours, linear decay, zero after 72 hours", () => {
    const at = (hours) => pointsOf(scoreTarget({ reports: [{ reason: "spam", createdAt: hoursAgo(hours) }], now: NOW }), "recency");
    assert.equal(at(0), 15);
    assert.equal(at(6), 15);
    assert.equal(at(39), 8); // halfway between 6h and 72h
    assert.equal(at(72), 0);
    assert.equal(at(200), 0);
});

test("freshness uses the newest report of the target", () => {
    const result = scoreTarget({
        reports: [{ reason: "spam", createdAt: hoursAgo(100) }, { reason: "spam", createdAt: hoursAgo(2) }],
        now: NOW,
    });
    assert.equal(pointsOf(result, "recency"), 15);
});

test("score is the sum of the parts and maps to a level", () => {
    const result = scoreTarget({
        reports: [
            { reason: "violence", createdAt: hoursAgo(1) },
            { reason: "violence", createdAt: hoursAgo(2) },
            { reason: "spam", createdAt: hoursAgo(3) },
        ],
        authorHistory: { reportedOther: 1, actionedOther: 0 },
        now: NOW,
    });
    // reporters 21 + reason 30 + author 5 + recency 15
    assert.equal(result.score, 71);
    assert.equal(result.score, result.breakdown.reduce((sum, part) => sum + part.points, 0));
    assert.equal(result.level, "high");
    assert.equal(levelFor(59), "medium");
    assert.equal(levelFor(30), "medium");
    assert.equal(levelFor(29), "low");
});

test("one old spam report is low priority", () => {
    const result = scoreTarget({ reports: [{ reason: "spam", createdAt: hoursAgo(100) }], now: NOW });
    assert.equal(result.score, 19);
    assert.equal(result.level, "low");
});
