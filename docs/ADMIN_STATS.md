# Admin statistics page (UC25, proposed number)

Admin-only page that shows daily activity so an administrator can see how the network is growing and how many reports are coming in.

## Use case

- **Name:** View statistics dashboard (UC25 — proposed number; UC23 is real-time messaging, UC24 is prioritized moderation).
- **Actor:** Administrator (account with `isAdmin = true`).
- **Precondition:** Logged in as an administrator. Non-admin users receive 403 from the API and do not see the "Quản trị" menu item.
- **Main flow:**
  1. The administrator opens "Quản trị". The "Thống kê" tab is shown first.
  2. The system shows four totals: all users, locked accounts, visible (active) posts, pending reports.
  3. The system shows three column charts for the selected range: new users per day, new posts per day, new reports per day.
  4. The administrator switches the range between 7, 14 and 30 days, or switches to the table view for exact numbers.
- **Alternative flows:** the API fails → an error with a "Thử lại" button; the range parameter is not 7/14/30 → API answers 400.
- **Postcondition:** read-only; no data is changed.

## API

`GET /api/admin/stats?days=7|14|30` (default 14), admin only.

```json
{
  "range": { "days": 14, "from": "2026-11-08", "to": "2026-11-21", "timezone": "Asia/Ho_Chi_Minh" },
  "totals": { "users": 10, "lockedUsers": 1, "activePosts": 25, "pendingReports": 2 },
  "series": {
    "users":   [{ "date": "2026-11-08", "count": 0 }],
    "posts":   [{ "date": "2026-11-08", "count": 0 }],
    "reports": [{ "date": "2026-11-08", "count": 0 }]
  }
}
```

## How the numbers are counted

- A "day" is a calendar day in Vietnam time (UTC+7). Days without activity are returned with `count: 0`, so the charts always have one column per day.
- New users: users by `createdAt`. New posts: posts by `createdAt`, excluding `status = deleted` (shared posts count as posts). New reports: reports by `createdAt`, any status.
- Totals are current values, not limited to the range.

## Implementation notes

- Server: `server/utils/adminStats.js` (pure helpers), `getStats` in `server/controllers/adminControllers.js`, route in `server/routes/admin.js`.
- Client: `client/src/components/AdminStats.jsx` (SVG charts, no new dependency), tab switch in `AdminPanel.jsx`, styles at the end of `admin.css`.
- Tests: `server/test/admin-stats-util.test.js`, `server/test/admin-stats.test.js`.
