// Helpers for the admin statistics endpoint. Pure functions (no database access) so they are easy to test.
//
// "Day" means a calendar day in Vietnam time (UTC+7, no daylight saving). The same offset is
// passed to MongoDB's $dateToString, so the grouping and the zero-filled day list always agree.

const DAY_MS = 24 * 60 * 60 * 1000;
const STATS_TIMEZONE = "+07:00";
const TZ_OFFSET_MS = 7 * 60 * 60 * 1000;
const ALLOWED_RANGE_DAYS = [7, 14, 30];
const DEFAULT_RANGE_DAYS = 14;

// Returns the number of days, or null when the value is not an allowed range.
function parseRangeDays(value) {
    if (value === undefined) return DEFAULT_RANGE_DAYS;
    if (typeof value !== "string" || !/^\d+$/.test(value)) return null;
    const days = Number(value);
    return ALLOWED_RANGE_DAYS.includes(days) ? days : null;
}

// "YYYY-MM-DD" of the Vietnam-time day that contains `date`.
function dayKey(date) {
    return new Date(date.getTime() + TZ_OFFSET_MS).toISOString().slice(0, 10);
}

// Day keys from oldest to newest, ending with today.
function buildDayKeys(days, now = new Date()) {
    const keys = [];
    for (let i = days - 1; i >= 0; i -= 1) {
        keys.push(dayKey(new Date(now.getTime() - i * DAY_MS)));
    }
    return keys;
}

// The instant (as a UTC Date) when the first day of the range starts, i.e. 00:00 Vietnam time.
function rangeStart(days, now = new Date()) {
    const todayStartUtc = Date.parse(`${dayKey(now)}T00:00:00Z`) - TZ_OFFSET_MS;
    return new Date(todayStartUtc - (days - 1) * DAY_MS);
}

// rows: [{ _id: "YYYY-MM-DD", count: n }] from an aggregation. Days without rows become 0.
function fillSeries(keys, rows) {
    const counts = new Map(rows.map((row) => [row._id, row.count]));
    return keys.map((date) => ({ date, count: counts.get(date) || 0 }));
}

module.exports = {
    STATS_TIMEZONE,
    ALLOWED_RANGE_DAYS,
    DEFAULT_RANGE_DAYS,
    parseRangeDays,
    dayKey,
    buildDayKeys,
    rangeStart,
    fillSeries,
};
