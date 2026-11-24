import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { API_BASE } from "../lib/api.js";
import { moderationContentPath } from "../lib/moderationContent.js";

const LEVEL_LABELS = { high: "Ưu tiên cao", medium: "Trung bình", low: "Thấp" };
const TARGET_LABELS = { post: "Bài viết", comment: "Bình luận" };

function formatTime(value) {
  return new Date(value).toLocaleString("vi-VN");
}

function ModerationItem({ item, busy, onResolve }) {
  const author = item.author?.username;
  const contentPath = moderationContentPath(item);
  return (
    <article className={`ridge-mod-item is-${item.level}`}>
      <div className="ridge-mod-top">
        <span className={`ridge-mod-level is-${item.level}`}>{LEVEL_LABELS[item.level]}</span>
        <span className="ridge-mod-score" aria-label={`Điểm ưu tiên ${item.score} trên 100`}>{item.score}<small>/100</small></span>
        {item.target.available ? <Link className="ridge-admin-report-type ridge-mod-link" to={contentPath} state={{ from: "/admin", tab: "moderation" }}>{TARGET_LABELS[item.targetType] || item.targetType}</Link> : <span className="ridge-admin-report-type">{TARGET_LABELS[item.targetType] || item.targetType}</span>}
        {author && <span className="ridge-mod-author">của {author}</span>}
      </div>

      {item.target.available ? (
        <Link className="ridge-mod-content ridge-mod-content-link" to={contentPath} state={{ from: "/admin", tab: "moderation" }}>{item.target.content}{item.target.hasMedia ? " [kèm ảnh/video]" : ""}</Link>
      ) : (
        <p className="ridge-mod-content is-muted">Nội dung đã bị xóa</p>
      )}
      {item.target.available && <Link className="ridge-admin-action is-neutral ridge-mod-open" to={contentPath} state={{ from: "/admin", tab: "moderation" }}>Xem nội dung</Link>}

      <div className="ridge-mod-reasons">
        <span>{item.reportCount} báo cáo</span>
        {item.reasons.map((reason) => (
          <span className="ridge-mod-chip" key={reason.reason}>{reason.label} ×{reason.count}</span>
        ))}
        <time dateTime={item.lastReportedAt}>Mới nhất: {formatTime(item.lastReportedAt)}</time>
      </div>

      <details className="ridge-mod-details">
        <summary>Vì sao điểm này?</summary>
        <ul className="ridge-mod-breakdown">
          {item.breakdown.map((part) => (
            <li key={part.key}>
              <div className="ridge-mod-breakdown-head">
                <span>{part.label}</span>
                <strong>{part.points}/{part.max}</strong>
              </div>
              <div className="ridge-mod-bar" aria-hidden="true"><span style={{ width: `${(part.points / part.max) * 100}%` }} /></div>
              <p>{part.detail}</p>
            </li>
          ))}
        </ul>
      </details>

      <details className="ridge-mod-details">
        <summary>Xem {item.reportCount} báo cáo</summary>
        <ul className="ridge-mod-reports">
          {item.reports.map((report) => (
            <li key={report._id}>
              <strong>{report.reporter || "—"}</strong> · {report.reasonLabel} · <time dateTime={report.createdAt}>{formatTime(report.createdAt)}</time>
              {report.description && <p>{report.description}</p>}
            </li>
          ))}
        </ul>
      </details>

      <div className="ridge-admin-report-actions">
        {item.target.available && <button className="ridge-admin-action is-neutral" type="button" disabled={busy} aria-label={`Đánh dấu đã xem ${item.reportCount} báo cáo`} onClick={() => onResolve(item, "reviewed")}>Đã xem</button>}
        <button className="ridge-admin-action is-danger" type="button" disabled={busy} aria-label={`Đánh dấu đã xử lý ${item.reportCount} báo cáo`} onClick={() => onResolve(item, "actioned")}>Đã xử lý</button>
      </div>
    </article>
  );
}

function ModerationQueue({ token }) {
  const [queue, setQueue] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [busyKey, setBusyKey] = useState("");
  const requestId = useRef(0);

  const loadQueue = useCallback(async () => {
    const currentRequest = requestId.current + 1;
    requestId.current = currentRequest;
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch(`${API_BASE}/api/admin/reports/priority`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Không thể tải hàng đợi kiểm duyệt.");
      if (currentRequest !== requestId.current) return;
      setQueue(data);
    } catch (requestError) {
      if (currentRequest === requestId.current) setError(requestError.message);
    } finally {
      if (currentRequest === requestId.current) setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadQueue(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadQueue]);

  async function resolveItem(item, status) {
    const key = `${item.targetType}:${item.targetId}`;
    setBusyKey(key);
    try {
      const response = await fetch(`${API_BASE}/api/admin/reports/targets/${item.targetType}/${item.targetId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Không thể cập nhật báo cáo.");
      await loadQueue();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusyKey("");
    }
  }

  if (error) {
    return (
      <div className="async-data-state" role="alert" aria-live="assertive">
        <p className="feedback-message error">{error}</p>
        <button className="async-retry-button" type="button" onClick={() => { void loadQueue(); }}>Thử lại</button>
      </div>
    );
  }
  if (!queue) {
    return <div className="async-data-state" role="status" aria-live="polite"><p className="async-data-message">Đang tải...</p></div>;
  }

  const { summary, scoring } = queue;
  return (
    <div className={`ridge-mod${isLoading ? " is-refreshing" : ""}`} aria-busy={isLoading}>
      <section className="side-card ridge-admin-card">
        <header className="ridge-admin-card-header ridge-stats-chart-header">
          <h2>Hàng đợi kiểm duyệt</h2>
          <span className="ridge-stats-chart-total">{summary.total} nội dung đang chờ</span>
        </header>
        <div className="ridge-mod-summary">
          <span className="ridge-mod-level is-high">Ưu tiên cao {summary.high}</span>
          <span className="ridge-mod-level is-medium">Trung bình {summary.medium}</span>
          <span className="ridge-mod-level is-low">Thấp {summary.low}</span>
        </div>
        <details className="ridge-mod-details ridge-mod-rules">
          <summary>Cách tính điểm (tối đa 100, không dùng AI)</summary>
          <ul>
            <li>Số người báo cáo khác nhau: tối đa {scoring.points.reporters} điểm (đủ điểm khi có từ 5 người).</li>
            <li>Mức nghiêm trọng của lý do: tối đa {scoring.points.reason} điểm (Bạo lực nặng nhất, rồi Quấy rối, Thông tin sai lệch, Spam, Khác).</li>
            <li>Tác giả bị báo cáo nhiều lần: tối đa {scoring.points.author} điểm, tính theo các nội dung khác của tác giả bị báo cáo (nội dung đã xử lý tính gấp đôi).</li>
            <li>Độ mới của báo cáo: tối đa {scoring.points.recency} điểm, đủ điểm trong 6 giờ rồi giảm dần về 0 sau 72 giờ.</li>
            <li>Ưu tiên cao từ {scoring.thresholds.high} điểm; trung bình từ {scoring.thresholds.medium} điểm.</li>
          </ul>
        </details>
      </section>

      {queue.items.length === 0 ? (
        <p className="ridge-admin-empty">Không có báo cáo đang chờ.</p>
      ) : (
        <div className="ridge-mod-list">
          {queue.items.map((item) => (
            <ModerationItem key={`${item.targetType}:${item.targetId}`} item={item} busy={busyKey === `${item.targetType}:${item.targetId}`} onResolve={resolveItem} />
          ))}
        </div>
      )}
      {queue.truncated && <p className="ridge-stats-note">Chỉ hiển thị các nội dung có điểm cao nhất.</p>}
    </div>
  );
}

export default ModerationQueue;
