// Rule-based priority score for reported content (no AI involved).
//
// Reports are grouped per target (one post or one comment). Each target gets a score from 0 to 100
// made of four parts. Every part is a simple rule, so an administrator can always see WHY a target is
// ranked where it is. All numbers below are constants on purpose: change them here, nowhere else.

const POINTS = { reporters: 35, reason: 30, author: 20, recency: 15 };

// Weight of the most serious reason among the reports (1 = full points of the "reason" part).
const REASON_WEIGHTS = { violence: 1, abuse: 0.8, misinfo: 0.6, spam: 0.4, other: 0.3 };
const REASON_LABELS = {
    spam: "Spam",
    violence: "Bạo lực",
    abuse: "Quấy rối hoặc lạm dụng",
    misinfo: "Thông tin sai lệch",
    other: "Khác",
};

const REPORTERS_FOR_FULL = 5;        // 5 or more different reporters = full points
const AUTHOR_HISTORY_FOR_FULL = 4;   // history units (see below) needed for full points
const RECENCY_FULL_HOURS = 6;        // newest report not older than this = full points
const RECENCY_ZERO_HOURS = 72;       // newest report older than this = 0 points
const LEVEL_THRESHOLDS = { high: 60, medium: 30 };

const HOUR_MS = 60 * 60 * 1000;

function describeAge(hours) {
    if (hours < 1) return "dưới 1 giờ";
    if (hours < 48) return `${Math.floor(hours)} giờ`;
    return `${Math.floor(hours / 24)} ngày`;
}

function levelFor(score) {
    if (score >= LEVEL_THRESHOLDS.high) return "high";
    if (score >= LEVEL_THRESHOLDS.medium) return "medium";
    return "low";
}

// reports: [{ reason, createdAt }] — pending reports of ONE target. One reporter can report a target
//          only once (unique index), so reports.length is the number of different reporters.
// authorHistory: { reportedOther, actionedOther } — how many OTHER posts/comments of the same author
//          were reported, and how many of those were marked "actioned". An actioned item counts twice
//          (once as reported, once as actioned), because it was a confirmed violation.
function scoreTarget({ reports, authorHistory = {}, now = new Date() }) {
    const reportedOther = authorHistory.reportedOther || 0;
    const actionedOther = authorHistory.actionedOther || 0;
    if (!reports.length) {
        return { score: 0, level: "low", breakdown: [] };
    }

    // 1. Number of different reporters.
    const reporterCount = reports.length;
    const reporterPoints = Math.round(POINTS.reporters * Math.min(reporterCount, REPORTERS_FOR_FULL) / REPORTERS_FOR_FULL);

    // 2. Most serious reason.
    let heaviest = reports[0].reason;
    for (const report of reports) {
        const weight = REASON_WEIGHTS[report.reason] ?? REASON_WEIGHTS.other;
        if (weight > (REASON_WEIGHTS[heaviest] ?? REASON_WEIGHTS.other)) heaviest = report.reason;
    }
    const reasonPoints = Math.round(POINTS.reason * (REASON_WEIGHTS[heaviest] ?? REASON_WEIGHTS.other));

    // 3. Author reported repeatedly.
    const historyUnits = reportedOther + actionedOther;
    const authorPoints = Math.round(POINTS.author * Math.min(historyUnits, AUTHOR_HISTORY_FOR_FULL) / AUTHOR_HISTORY_FOR_FULL);

    // 4. Freshness of the newest report (full points for 6 hours, then falls linearly to 0 at 72 hours).
    const newest = Math.max(...reports.map((report) => new Date(report.createdAt).getTime()));
    const ageHours = Math.max(0, (now.getTime() - newest) / HOUR_MS);
    let recencyRatio = 1;
    if (ageHours >= RECENCY_ZERO_HOURS) recencyRatio = 0;
    else if (ageHours > RECENCY_FULL_HOURS) {
        recencyRatio = 1 - (ageHours - RECENCY_FULL_HOURS) / (RECENCY_ZERO_HOURS - RECENCY_FULL_HOURS);
    }
    const recencyPoints = Math.round(POINTS.recency * recencyRatio);

    const breakdown = [
        {
            key: "reporters", label: "Số người báo cáo", points: reporterPoints, max: POINTS.reporters,
            detail: `${reporterCount} người báo cáo khác nhau`,
        },
        {
            key: "reason", label: "Mức nghiêm trọng của lý do", points: reasonPoints, max: POINTS.reason,
            detail: `Lý do nặng nhất: ${REASON_LABELS[heaviest] || REASON_LABELS.other}`,
        },
        {
            key: "author", label: "Tác giả bị báo cáo nhiều lần", points: authorPoints, max: POINTS.author,
            detail: historyUnits === 0
                ? "Không có nội dung nào khác của tác giả bị báo cáo"
                : `${reportedOther} nội dung khác của tác giả bị báo cáo, ${actionedOther} đã bị xử lý`,
        },
        {
            key: "recency", label: "Độ mới của báo cáo", points: recencyPoints, max: POINTS.recency,
            detail: `Báo cáo mới nhất cách đây ${describeAge(ageHours)}`,
        },
    ];

    const score = reporterPoints + reasonPoints + authorPoints + recencyPoints;
    return { score, level: levelFor(score), breakdown };
}

module.exports = {
    POINTS,
    REASON_WEIGHTS,
    REASON_LABELS,
    LEVEL_THRESHOLDS,
    REPORTERS_FOR_FULL,
    AUTHOR_HISTORY_FOR_FULL,
    RECENCY_FULL_HOURS,
    RECENCY_ZERO_HOURS,
    levelFor,
    scoreTarget,
};
