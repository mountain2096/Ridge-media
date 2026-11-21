# Prioritized moderation (UC24) — connected to UC15 and UC21

The administrator no longer reads a flat list of reports. Pending reports are grouped per reported post or comment, each group gets a **priority score from 0 to 100** computed by simple rules, and the groups are shown from the highest score down. No AI service is used; every number can be explained to the administrator on screen ("Vì sao điểm này?").

## Connection with existing use cases

- **UC15 — Report content (reporter side).** Unchanged. It supplies the data the rules read: reporter, reason, time of the report, and the one-report-per-person rule (a person can report a target only once, so the number of reports of a target is the number of different reporters).
- **UC21 — Review reports (administrator side).** The review screen is now the "Kiểm duyệt" tab. It shows the queue sorted by score and lets the administrator mark *all* pending reports of one item as "Đã xem" (reviewed) or "Đã xử lý" (actioned) in one click. As before, "actioned" only records the decision; it does not delete or hide the content.
- **UC24 — Prioritized moderation (new).** The scoring and the sorted queue described here.

## Use case UC24

- **Actor:** Administrator.
- **Precondition:** logged in as an administrator; there are pending reports.
- **Main flow:**
  1. The administrator opens Quản trị → Kiểm duyệt.
  2. The system groups pending reports per post/comment, scores each group and sorts by score. A summary shows how many items are high / medium / low priority.
  3. For each item the system shows the level, the score, the content (first 200 characters), the author, the number of reports with their reasons and the time of the newest report.
  4. The administrator opens "Vì sao điểm này?" to see the four parts of the score, and "Xem báo cáo" to read each report.
  5. The administrator marks the item "Đã xem" or "Đã xử lý". All pending reports of that item change status and record who reviewed them and when. The item leaves the queue.
- **Alternative flows:** the content was deleted or hidden after being reported → the item stays, shows "Nội dung đã bị xóa hoặc ẩn", and can still be marked; no pending reports left for the item → API answers 404; API error → message with "Thử lại".
- **Postcondition:** report statuses updated with reviewer and time.

## Scoring rules

Score = sum of four parts (each part is rounded to a whole number, so the total always equals the sum shown on screen).

| Part | Max | Rule |
|---|---|---|
| Number of different reporters | 35 | `35 × min(reporters, 5) / 5` |
| Seriousness of the reason | 30 | `30 ×` weight of the most serious reason among the reports: violence 1.0, abuse 0.8, misinfo 0.6, spam 0.4, other 0.3 |
| Author reported repeatedly | 20 | `units = (other items of the author that were reported) + (of those, how many were actioned)`; `20 × min(units, 4) / 4`. An actioned item counts twice because it was a confirmed violation |
| Freshness of the newest report | 15 | full points if the newest report is at most 6 hours old, then falls linearly to 0 at 72 hours |

Levels: **high** from 60 points, **medium** from 30 points, **low** below 30. Ties are broken by the time of the newest report.

### Examples

- 3 reporters (violence, spam, violence), newest report 1 hour ago, the author has 1 other reported post that was never actioned: 21 + 30 + 5 + 15 = **71, high**.
- 1 spam report, 100 hours old, author without history: 7 + 12 + 0 + 0 = **19, low**.

All constants are in `server/utils/reportPriority.js`.

## API (administrator only)

- `GET /api/admin/reports/priority` → `{ generatedAt, items, summary: { total, high, medium, low }, truncated, scoring }`. Each item has `targetType`, `targetId`, `score`, `level`, `breakdown` (the four parts with points, max and a text explanation), `authorHistory`, `reportCount`, `reasons`, `author`, `target` (availability and a content snippet) and the list of `reports`.
- `PATCH /api/admin/reports/targets/:targetType/:targetId` with `{ "status": "reviewed" | "actioned" }` → updates all pending reports of that target (`updated` = number changed).
- The older `GET /api/admin/reports` and `PATCH /api/admin/reports/:reportId` still exist.

## Limits (be honest in the report)

- The score only helps the administrator decide what to read first; a person always decides.
- The weights are hand-chosen defaults, not trained on data. They can be tuned in one file.
- At most 1,000 pending reports are read and 100 items shown per request (fine for a course project).
- A report is not tied to a specific edit of a post; if the author edits the post after it was reported, the report still points to the post.

## Implementation notes

- Server: `server/utils/reportPriority.js` (pure scoring), `server/controllers/moderationControllers.js`, routes in `server/routes/admin.js`.
- Client: `client/src/components/ModerationQueue.jsx`; `AdminPanel.jsx` now has three tabs: Thống kê (default), Kiểm duyệt, Tài khoản. Styles at the end of `admin.css`.
- Tests: `server/test/report-priority.test.js`, `server/test/admin-priority.test.js`.
