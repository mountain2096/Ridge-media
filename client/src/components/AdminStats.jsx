import { useCallback, useEffect, useRef, useState } from "react";
import { API_BASE } from "../lib/api.js";

const RANGE_OPTIONS = [7, 14, 30];
const CHART_HEIGHT = 200;
const MARGIN = { top: 22, right: 10, bottom: 26, left: 34 };
const NICE_STEPS = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000];

const SERIES = [
  { key: "users", title: "Người dùng mới", unit: "người dùng", colorClass: "is-users" },
  { key: "posts", title: "Bài đăng mới", unit: "bài đăng", colorClass: "is-posts" },
  { key: "reports", title: "Báo cáo mới", unit: "báo cáo", colorClass: "is-reports" },
];

function formatShortDay(key) {
  return `${key.slice(8, 10)}/${key.slice(5, 7)}`;
}

function formatFullDay(key) {
  return `${key.slice(8, 10)}/${key.slice(5, 7)}/${key.slice(0, 4)}`;
}

function buildAxis(maxValue) {
  const step = NICE_STEPS.find((candidate) => maxValue / candidate <= 4) ?? 20000;
  const top = Math.max(step * Math.ceil(maxValue / step), step * 2);
  const ticks = [];
  for (let value = 0; value <= top; value += step) ticks.push(value);
  return { top, ticks };
}

// Column with a rounded top (4px) and a square base on the baseline.
function columnPath(x, y, width, height) {
  const radius = Math.min(4, width / 2, height);
  return `M${x},${y + height} V${y + radius} Q${x},${y} ${x + radius},${y} H${x + width - radius} Q${x + width},${y} ${x + width},${y + radius} V${y + height} Z`;
}

function ColumnChart({ title, unit, colorClass, points }) {
  const frameRef = useRef(null);
  const [width, setWidth] = useState(600);
  const [activeIndex, setActiveIndex] = useState(null);

  useEffect(() => {
    const element = frameRef.current;
    if (!element || typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver((entries) => {
      const nextWidth = Math.round(entries[0].contentRect.width);
      if (nextWidth > 0) setWidth(nextWidth);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const total = points.reduce((sum, point) => sum + point.count, 0);
  const maxValue = points.reduce((max, point) => Math.max(max, point.count), 0);
  const peakIndex = maxValue > 0 ? points.findIndex((point) => point.count === maxValue) : -1;
  const { top: axisTop, ticks } = buildAxis(maxValue);

  const innerWidth = Math.max(width - MARGIN.left - MARGIN.right, 40);
  const innerHeight = CHART_HEIGHT - MARGIN.top - MARGIN.bottom;
  const band = innerWidth / points.length;
  const barWidth = Math.min(24, Math.max(3, band - 4));
  const yFor = (value) => MARGIN.top + innerHeight - (value / axisTop) * innerHeight;
  const labelEvery = Math.ceil(points.length / Math.max(2, Math.floor(innerWidth / 52)));

  const activePoint = activeIndex === null ? null : points[activeIndex];
  const activeCenter = activeIndex === null ? 0 : MARGIN.left + activeIndex * band + band / 2;
  const tooltipLeft = Math.min(Math.max(activeCenter, 62), Math.max(width - 62, 62));

  return (
    <section className="side-card ridge-admin-card ridge-stats-chart-card">
      <header className="ridge-admin-card-header ridge-stats-chart-header">
        <h2>{title}</h2>
        <span className="ridge-stats-chart-total">{total.toLocaleString("vi-VN")} trong kỳ</span>
      </header>
      <div className={`ridge-stats-chart ${colorClass}`} ref={frameRef}>
        <svg width={width} height={CHART_HEIGHT} viewBox={`0 0 ${width} ${CHART_HEIGHT}`} role="group" aria-label={`Biểu đồ cột: ${title} theo ngày`}>
          {ticks.map((tick) => (
            <g key={tick}>
              <line className="ridge-stats-grid" x1={MARGIN.left} x2={width - MARGIN.right} y1={yFor(tick)} y2={yFor(tick)} />
              <text className="ridge-stats-axis-text" x={MARGIN.left - 8} y={yFor(tick) + 4} textAnchor="end">{tick}</text>
            </g>
          ))}
          {points.map((point, index) => {
            const x = MARGIN.left + index * band + (band - barWidth) / 2;
            const barHeight = (point.count / axisTop) * innerHeight;
            return (
              <g key={point.date}>
                {point.count > 0 && (
                  <path className={`ridge-stats-bar${activeIndex === index ? " is-active" : ""}`} d={columnPath(x, yFor(point.count), barWidth, barHeight)} />
                )}
                {(points.length - 1 - index) % labelEvery === 0 && (
                  <text className="ridge-stats-axis-text" x={x + barWidth / 2} y={CHART_HEIGHT - 8} textAnchor="middle">{formatShortDay(point.date)}</text>
                )}
              </g>
            );
          })}
          {peakIndex >= 0 && (
            <text className="ridge-stats-peak-text" x={MARGIN.left + peakIndex * band + band / 2} y={yFor(maxValue) - 6} textAnchor="middle">{maxValue}</text>
          )}
          {points.map((point, index) => (
            <rect
              key={`hit-${point.date}`}
              className="ridge-stats-hit"
              x={MARGIN.left + index * band}
              y={0}
              width={band}
              height={CHART_HEIGHT - MARGIN.bottom}
              tabIndex={0}
              role="img"
              aria-label={`${formatFullDay(point.date)}: ${point.count} ${unit}`}
              onPointerEnter={() => setActiveIndex(index)}
              onPointerLeave={() => setActiveIndex(null)}
              onFocus={() => setActiveIndex(index)}
              onBlur={() => setActiveIndex(null)}
            />
          ))}
        </svg>
        {activePoint && (
          <div className="ridge-stats-tooltip" style={{ left: tooltipLeft }} role="status">
            <strong>{activePoint.count.toLocaleString("vi-VN")} {unit}</strong>
            <span>{formatFullDay(activePoint.date)}</span>
          </div>
        )}
      </div>
    </section>
  );
}

function StatsTable({ series }) {
  const rows = series.users.map((point, index) => ({
    date: point.date,
    users: point.count,
    posts: series.posts[index].count,
    reports: series.reports[index].count,
  }));
  return (
    <section className="side-card ridge-admin-card">
      <header className="ridge-admin-card-header"><h2>Số liệu theo ngày</h2></header>
      <div className="ridge-stats-table-wrap">
        <table className="ridge-stats-table">
          <thead>
            <tr><th scope="col">Ngày</th><th scope="col">Người dùng mới</th><th scope="col">Bài đăng mới</th><th scope="col">Báo cáo mới</th></tr>
          </thead>
          <tbody>
            {[...rows].reverse().map((row) => (
              <tr key={row.date}>
                <th scope="row">{formatFullDay(row.date)}</th>
                <td>{row.users}</td>
                <td>{row.posts}</td>
                <td>{row.reports}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function AdminStats({ token }) {
  const [days, setDays] = useState(14);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [showTable, setShowTable] = useState(false);
  const requestId = useRef(0);

  const loadStats = useCallback(async () => {
    const currentRequest = requestId.current + 1;
    requestId.current = currentRequest;
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch(`${API_BASE}/api/admin/stats?days=${days}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Không thể tải thống kê.");
      if (currentRequest !== requestId.current) return;
      setStats(data);
    } catch (requestError) {
      if (currentRequest === requestId.current) setError(requestError.message);
    } finally {
      if (currentRequest === requestId.current) setIsLoading(false);
    }
  }, [days, token]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadStats(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadStats]);

  const totals = stats?.totals;
  const tiles = totals ? [
    { label: "Tổng người dùng", value: totals.users },
    { label: "Tài khoản bị khóa", value: totals.lockedUsers },
    { label: "Bài đăng đang hiển thị", value: totals.activePosts },
    { label: "Báo cáo đang chờ", value: totals.pendingReports },
  ] : [];

  return (
    <div className="ridge-stats">
      <div className="ridge-stats-toolbar">
        <div className="ridge-stats-ranges" role="group" aria-label="Khoảng thời gian">
          {RANGE_OPTIONS.map((option) => (
            <button key={option} type="button" className={`ridge-stats-range${days === option ? " is-selected" : ""}`} aria-pressed={days === option} onClick={() => setDays(option)}>{option} ngày</button>
          ))}
        </div>
        <button className="ridge-admin-action is-neutral" type="button" onClick={() => setShowTable((value) => !value)}>{showTable ? "Xem biểu đồ" : "Xem dạng bảng"}</button>
      </div>

      {error ? (
        <div className="async-data-state" role="alert" aria-live="assertive">
          <p className="feedback-message error">{error}</p>
          <button className="async-retry-button" type="button" onClick={() => { void loadStats(); }}>Thử lại</button>
        </div>
      ) : !stats ? (
        <div className="async-data-state" role="status" aria-live="polite"><p className="async-data-message">Đang tải...</p></div>
      ) : (
        <div className={`ridge-stats-body${isLoading ? " is-refreshing" : ""}`} aria-busy={isLoading}>
          <div className="ridge-stats-tiles">
            {tiles.map((tile) => (
              <div className="ridge-stats-tile" key={tile.label}>
                <span className="ridge-stats-tile-value">{tile.value.toLocaleString("vi-VN")}</span>
                <span className="ridge-stats-tile-label">{tile.label}</span>
              </div>
            ))}
          </div>
          <p className="ridge-stats-note">Từ {formatFullDay(stats.range.from)} đến {formatFullDay(stats.range.to)} (giờ Việt Nam).</p>
          {showTable ? <StatsTable series={stats.series} /> : SERIES.map((item) => (
            <ColumnChart key={item.key} title={item.title} unit={item.unit} colorClass={item.colorClass} points={stats.series[item.key]} />
          ))}
        </div>
      )}
    </div>
  );
}

export default AdminStats;
