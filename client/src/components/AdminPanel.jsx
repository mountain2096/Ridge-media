import { resolveMediaUrl } from "../lib/api.js";
import { useCallback, useEffect, useState } from "react";
import { API_BASE } from "../lib/api.js";
import { useConfirm } from "./ConfirmDialog.jsx";
import AdminStats from "./AdminStats.jsx";
import ModerationQueue from "./ModerationQueue.jsx";
import "../admin.css";

function AdminPanel() {
  const confirmAction = useConfirm();
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [tab, setTab] = useState("stats");
  const token = localStorage.getItem("token");

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const userResponse = await fetch(`${API_BASE}/api/admin/users?limit=100`, { headers });
      const userData = await userResponse.json();
      if (!userResponse.ok) throw new Error(userData.message || "Không thể tải danh sách người dùng.");
      setError("");
      setUsers(userData.users);
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

  return (
    <section className="connections-page ridge-admin-page">
      <h1 className="section-title ridge-admin-title">Quản trị</h1>
      <div className="ridge-admin-tabs" role="group" aria-label="Khu vực quản trị">
        <button className={`ridge-admin-tab${tab === "stats" ? " is-selected" : ""}`} type="button" aria-pressed={tab === "stats"} onClick={() => setTab("stats")}>Thống kê</button>
        <button className={`ridge-admin-tab${tab === "moderation" ? " is-selected" : ""}`} type="button" aria-pressed={tab === "moderation"} onClick={() => setTab("moderation")}>Kiểm duyệt</button>
        <button className={`ridge-admin-tab${tab === "accounts" ? " is-selected" : ""}`} type="button" aria-pressed={tab === "accounts"} onClick={() => setTab("accounts")}>Tài khoản</button>
      </div>
      {tab === "stats" ? <AdminStats token={token} /> : tab === "moderation" ? <ModerationQueue token={token} /> : isLoading || error ? (
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
                  {user.profilePicture ? <img src={resolveMediaUrl(user.profilePicture)} alt="" /> : (user.username?.charAt(0).toUpperCase() || "?")}
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
        </>
      )}
    </section>
  );
}

export default AdminPanel;
