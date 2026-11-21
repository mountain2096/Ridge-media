const test = require("node:test");
const assert = require("node:assert/strict");
const { parseRangeDays, dayKey, buildDayKeys, rangeStart, fillSeries } = require("../utils/adminStats");

test("parseRangeDays accepts only the allowed ranges", () => {
    assert.equal(parseRangeDays(undefined), 14);
    assert.equal(parseRangeDays("7"), 7);
    assert.equal(parseRangeDays("30"), 30);
    assert.equal(parseRangeDays("10"), null);
    assert.equal(parseRangeDays("abc"), null);
    assert.equal(parseRangeDays("-7"), null);
    assert.equal(parseRangeDays(["7"]), null);
});

test("day keys use Vietnam time (UTC+7)", () => {
    // 20:00 UTC on 20 Nov is already 03:00 on 21 Nov in Vietnam.
    assert.equal(dayKey(new Date("2026-11-20T20:00:00Z")), "2026-11-21");
    assert.equal(dayKey(new Date("2026-11-20T16:59:59Z")), "2026-11-20");
});

test("buildDayKeys returns consecutive days ending today", () => {
    const keys = buildDayKeys(7, new Date("2026-11-21T05:00:00Z"));
    assert.deepEqual(keys, [
        "2026-11-15", "2026-11-16", "2026-11-17", "2026-11-18", "2026-11-19", "2026-11-20", "2026-11-21",
    ]);
    // Crosses a month boundary.
    const crossing = buildDayKeys(3, new Date("2026-12-01T05:00:00Z"));
    assert.deepEqual(crossing, ["2026-11-29", "2026-11-30", "2026-12-01"]);
});

test("rangeStart is 00:00 Vietnam time on the first day of the range", () => {
    const start = rangeStart(7, new Date("2026-11-21T05:00:00Z"));
    // 15 Nov 00:00 UTC+7 = 14 Nov 17:00 UTC
    assert.equal(start.toISOString(), "2026-11-14T17:00:00.000Z");
});

test("fillSeries fills missing days with zero and keeps order", () => {
    const keys = ["2026-11-19", "2026-11-20", "2026-11-21"];
    const series = fillSeries(keys, [{ _id: "2026-11-21", count: 4 }, { _id: "2026-11-19", count: 1 }]);
    assert.deepEqual(series, [
        { date: "2026-11-19", count: 1 },
        { date: "2026-11-20", count: 0 },
        { date: "2026-11-21", count: 4 },
    ]);
});
