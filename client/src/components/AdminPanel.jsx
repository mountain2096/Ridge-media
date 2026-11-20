import { useCallback, useEffect, useState } from "react";
import { API_BASE } from "../lib/api.js";
import { useConfirm } from "./ConfirmDialog.jsx";
import "../admin.css";

function AdminPanel() {
  const confirmAction = useConfirm();
  const [users, setUsers] = useState([]);
  const [reports, setReports] = useState([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const token = localStorage.getItem("token");

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [userResponse, reportResponse] = await Promise.all([
        fetch(`${API_BASE}/api/admin/users?limit=100`, { headers }),
        fetch(`${API_BASE}/api/admin/reports?status=pending`, { headers }),
      ]);
      const [userData, reportData] = await Promise.all([userResponse.json(), reportResponse.json()]);
      if (!userResponse.ok) throw new Error(userData.message || "Không thể tải danh sách người dùng.");
      if (!reportResponse.ok) throw new Error(reportData.message || "Không thể tải báo cáo.");
      setError("");
      setUsers(userData.users);
      setReports(reportData.reports);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadData(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadData]);

  async function updateUserLock(user) {
    if (!user.isLocked && !(await confirmAction({
      title: "Khóa tài khoản",
      message: `Khóa tài khoản ${user.username}?`,
      confirmLabel: "Khóa tài khoản",
      danger: true,
    }))) return;
    try {
      const response = await fetch(`${API_BASE}/api/admin/users/${user._id}/${user.isLocked ? "unlock" : "lock"}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Không thể cập nhật tài khoản.");
      await loadData();
    } catch (requestError) { setError(requestError.message); }
  }

  async function updateReport(reportId, status) {
    try {
      const response = await fetch(`${API_BASE}/api/admin/reports/${reportId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Không thể cập nhật báo cáo.");
      await loadData();
    } catch (requestError) { setError(requestError.message); }
  }

  return (
    <section className="connections-page ridge-admin-page">
      <h1 className="section-title ridge-admin-title">Quản trị</h1>
      {isLoading || error ? (
        <div className="async-data-state" role={error ? "alert" : "status"} aria-live={error ? "assertive" : "polite"}>
          <p className={error ? "feedback-message error" : "async-data-message"}>{error || "Đang tải..."}</p>
          {error && <button className="async-retry-button" type="button" onClick={() => { void loadData(); }}>Thử lại</button>}
        </div>
      ) : (
        <>
          <section className="side-card ridge-admin-card" aria-labelledby="admin-users-title">
            <header className="ridge-admin-card-header"><h2 id="admin-users-title">Tài khoản</h2></header>
            <div className="ridge-admin-users">
            {users.map((user) => (
              <div className="friend-request-row ridge-admin-user-row" key={user._id}>
                <span className="ridge-admin-avatar" aria-hidden="true">
                  {user.profilePicture ? <img src={user.profilePicture} alt="" /> : (user.username?.charAt(0).toUpperCase() || "?")}
                </span>
                <span className="ridge-admin-user-info">
                  <span className="ridge-admin-user-name">{user.username}</span>
                  <span className="ridge-admin-user-email">{user.email}{user.isAdmin ? " · Admin" : ""}</span>
                </span>
                {user.isLocked && <span className="ridge-admin-badge ridge-admin-badge-locked">Đã khóa</span>}
                {!user.isAdmin && <button className={`ridge-admin-action ${user.isLocked ? "is-neutral" : "is-danger"}`} type="button" aria-label={`${user.isLocked ? "Mở khóa" : "Khóa"} tài khoản ${user.username}`} onClick={() => updateUserLock(user)}>{user.isLocked ? "Mở khóa" : "Khóa"}</button>}
              </div>
            ))}
            </div>
          </section>
          <section className="side-card ridge-admin-card" aria-labelledby="admin-reports-title">
            <header className="ridge-admin-card-header"><h2 id="admin-reports-title">Báo cáo đang chờ</h2></header>
            {reports.length === 0 ? <p className="ridge-admin-empty">Không có báo cáo đang chờ.</p> : (
              <div className="ridge-admin-reports">
                {reports.map((report) => (
                  <article className="ridge-admin-report" key={report._id}>
                    <div className="ridge-admin-report-top">
                      <span className="ridge-admin-report-type">{report.targetType}</span>
                      <span className={`ridge-admin-badge ridge-admin-status-${report.status || "pending"}`}>{report.status === "reviewed" ? "Đã xem" : report.status === "actioned" ? "Đã xử lý" : "Đang chờ"}</span>
                    </div>
                    <p className="ridge-admin-report-reason">{report.reason}</p>
                    <p className="ridge-admin-report-description">{report.description || report.targetId}</p>
                    <div className="ridge-admin-report-meta">
                      <span><span className="ridge-admin-report-meta-label">Người báo cáo</span><span className="ridge-admin-report-meta-value">{report.reporterId?.username || report.reporterId?.toString() || "—"}</span></span>
                      {report.createdAt && <time dateTime={report.createdAt}><span className="ridge-admin-report-meta-label">Thời gian báo cáo</span><span className="ridge-admin-report-meta-value">{new Date(report.createdAt).toLocaleString("vi-VN")}</span></time>}
                    </div>
                    <div className="ridge-admin-report-actions">
                      <button className="ridge-admin-action is-neutral" type="button" aria-label={`Đánh dấu đã xem báo cáo ${report.targetType} ${report.targetId}`} onClick={() => updateReport(report._id, "reviewed")}>Đã xem</button>
                      <button className="ridge-admin-action is-danger" type="button" aria-label={`Đánh dấu đã xử lý báo cáo ${report.targetType} ${report.targetId}`} onClick={() => updateReport(report._id, "actioned")}>Đã xử lý</button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </section>
  );
}

export default AdminPanel;
