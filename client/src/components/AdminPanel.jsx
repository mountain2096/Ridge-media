import { useCallback, useEffect, useState } from "react";

function AdminPanel() {
  const [users, setUsers] = useState([]);
  const [reports, setReports] = useState([]);
  const [error, setError] = useState("");
  const token = localStorage.getItem("token");

  const loadData = useCallback(async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [userResponse, reportResponse] = await Promise.all([
        fetch("http://localhost:5000/api/admin/users?limit=100", { headers }),
        fetch("http://localhost:5000/api/admin/reports?status=pending", { headers }),
      ]);
      const [userData, reportData] = await Promise.all([userResponse.json(), reportResponse.json()]);
      if (!userResponse.ok) throw new Error(userData.message || "Không thể tải danh sách người dùng.");
      if (!reportResponse.ok) throw new Error(reportData.message || "Không thể tải báo cáo.");
      setError("");
      setUsers(userData.users);
      setReports(reportData.reports);
    } catch (requestError) {
      setError(requestError.message);
    }
  }, [token]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadData(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadData]);

  async function updateUserLock(user) {
    try {
      const response = await fetch(`http://localhost:5000/api/admin/users/${user._id}/${user.isLocked ? "unlock" : "lock"}`, {
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
      const response = await fetch(`http://localhost:5000/api/admin/reports/${reportId}`, {
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
    <section className="connections-page">
      <h1 className="section-title">Quản trị</h1>
      {error && <p className="feedback-message error">{error}</p>}
      <section className="side-card">
        <h2>Báo cáo đang chờ</h2>
        {reports.length === 0 ? <p>Không có báo cáo đang chờ.</p> : reports.map((report) => (
          <div className="friend-request-row" key={report._id}>
            <span>{report.targetType} · {report.reason} · {report.description || report.targetId}</span>
            <div>
              <button type="button" onClick={() => updateReport(report._id, "reviewed")}>Đã xem</button>
              <button type="button" onClick={() => updateReport(report._id, "actioned")}>Đã xử lý</button>
            </div>
          </div>
        ))}
      </section>
      <section className="side-card">
        <h2>Tài khoản</h2>
        {users.map((user) => (
          <div className="friend-request-row" key={user._id}>
            <span>{user.username} · {user.email}{user.isAdmin ? " · Admin" : ""}</span>
            {!user.isAdmin && <button type="button" onClick={() => updateUserLock(user)}>{user.isLocked ? "Mở khóa" : "Khóa"}</button>}
          </div>
        ))}
      </section>
    </section>
  );
}

export default AdminPanel;
