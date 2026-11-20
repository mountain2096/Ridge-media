import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { API_BASE } from "./lib/api.js";
import { ConfirmProvider } from "./components/ConfirmDialog.jsx";
import UserSearch from "./components/UserSearch.jsx";
import "./newsfeed.css";

function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentUser, setCurrentUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [messageCount, setMessageCount] = useState(0);
  const [requestCount, setRequestCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notificationError, setNotificationError] = useState("");
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const isFeed = location.pathname === "/feed";

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${API_BASE}/api/user/me`, {
      headers: { Authorization: "Bearer " + localStorage.getItem("token") },
      signal: controller.signal,
    }).then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Không thể tải hồ sơ.");
      setCurrentUser(data.user);
    }).catch((error) => {
      if (error.name !== "AbortError") setCurrentUser(null);
    });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    let mounted = true;
    let busy = false;
    async function refreshCounts() {
      if (busy) return;
      busy = true;
      try {
        const headers = { Authorization: "Bearer " + localStorage.getItem("token") };
        const [messagesResponse, requestsResponse] = await Promise.all([
          fetch(`${API_BASE}/api/message/conversations`, { headers }),
          fetch(`${API_BASE}/api/friend/requests`, { headers }),
        ]);
        const [messages, requests] = await Promise.all([messagesResponse.json(), requestsResponse.json()]);
        if (!mounted || !messagesResponse.ok || !requestsResponse.ok) return;
        setMessageCount((messages.conversations || []).reduce((sum, item) => sum + Number(item.unreadCount || 0), 0));
        setRequestCount((requests.request || []).length);
      } catch {
        // Badge counts are optional.
      } finally {
        busy = false;
      }
    }
    refreshCounts();
    const interval = window.setInterval(refreshCounts, 10000);
    window.addEventListener("focus", refreshCounts);
    return () => {
      mounted = false;
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshCounts);
    };
  }, []);

  async function toggleNotifications() {
    if (notificationOpen) return setNotificationOpen(false);
    setNotificationOpen(true);
    setNotificationError("");
    try {
      const response = await fetch(`${API_BASE}/api/notification`, {
        headers: { Authorization: "Bearer " + localStorage.getItem("token") },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Không thể tải thông báo.");
      setNotifications(data.notifications || []);
    } catch (error) {
      setNotificationError(error.message);
    }
  }

  async function markRead(id) {
    try {
      const response = await fetch(`${API_BASE}/api/notification/` + id + "/read", {
        method: "PATCH",
        headers: { Authorization: "Bearer " + localStorage.getItem("token") },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Không thể cập nhật thông báo.");
      setNotifications((items) => items.map((item) => item._id === id ? { ...item, isRead: true } : item));
    } catch (error) {
      setNotificationError(error.message);
    }
  }

  const navClass = ({ isActive }) => "menu-item " + (isActive ? "active" : "");
  const outletContext = { currentUser, setCurrentUser, searchQuery, setSearchQuery };
  function handleLogout() {
    try {
      if (currentUser?._id) {
        localStorage.removeItem(`ridge:recent-searches:${currentUser._id}`);
      } else {
        for (let index = localStorage.length - 1; index >= 0; index -= 1) {
          const key = localStorage.key(index);
          if (key?.startsWith("ridge:recent-searches:")) localStorage.removeItem(key);
        }
      }
    } catch {
      // Continue logout even when browser storage is unavailable.
    }
    try {
      localStorage.removeItem("token");
    } catch {
      // Continue logout even when browser storage is unavailable.
    }
    navigate("/", { replace: true });
  }
  return (
    <ConfirmProvider>
    <main className="home-layout">
      <header className="home-topbar">
        <div className="header-brand-search">
          <NavLink className="home-brand" to="/feed"><span className="home-brand-icon">R</span><span>Ridge</span></NavLink>
          <UserSearch key={currentUser?._id || "search-loading"} currentUser={currentUser} />
        </div>
        <div className="news-topbar-right">
          <NavLink className="header-icon-link" to="/messages" aria-label="Tin nhắn" title="Tin nhắn"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" /></svg>{messageCount > 0 && <span className="header-badge">{messageCount > 99 ? "99+" : messageCount}</span>}</NavLink>
          <div className="notification-wrap">
            <button className="header-icon-link notification-button" type="button" aria-label="Thông báo" aria-expanded={notificationOpen} onClick={toggleNotifications}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></svg>{notifications.some((item) => !item.isRead) && <span className="notification-dot" />}</button>
            {notificationOpen && <div className="notification-panel"><h2>Thông báo</h2>{notificationError && <p className="feedback-message error">{notificationError}</p>}{!notificationError && !notifications.length && <p>Chưa có thông báo nào.</p>}{notifications.map((item) => <button className={"notification-item " + (item.isRead ? "read" : "unread")} key={item._id} type="button" onClick={() => markRead(item._id)}><strong>{item.senderId?.username || "Người dùng"}</strong>{" "}{item.type === "like" ? "đã thích bài viết của bạn" : item.type === "comment" ? "đã bình luận bài viết của bạn" : item.type === "friend_request" ? "đã gửi lời mời kết bạn" : item.type === "friend_accept" ? "đã chấp nhận lời mời kết bạn" : item.type === "message" ? "đã gửi tin nhắn cho bạn" : item.type === "share" ? "đã chia sẻ bài viết của bạn" : "có cập nhật mới"}</button>)}</div>}
          </div>
          <div className="profile-menu-wrap">
            <button className="profile-menu-trigger" type="button" aria-label="Mở menu tài khoản" aria-expanded={profileMenuOpen} onClick={() => setProfileMenuOpen((open) => !open)}>
              <span className="user-avatar">{currentUser?.profilePicture ? <img src={currentUser.profilePicture} alt="" /> : currentUser?.username?.charAt(0).toUpperCase()}</span>
              <svg className="profile-menu-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
            </button>
            {profileMenuOpen && <div className="profile-menu">
              {currentUser?._id && <NavLink to={"/profile/" + currentUser._id} onClick={() => setProfileMenuOpen(false)}>Trang cá nhân</NavLink>}
              <NavLink to="/settings" onClick={() => setProfileMenuOpen(false)}>Cài đặt</NavLink>
              <button type="button" onClick={handleLogout}>Đăng xuất</button>
            </div>}
          </div>
        </div>
      </header>
      <aside className="home-sidebar">
        <nav className="home-menu" aria-label="Điều hướng chính">
          <NavLink className={navClass} to="/feed" end><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" /></svg>Bảng tin</NavLink>
          <NavLink className={navClass} to="/messages"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" /></svg><span className="menu-item-label">Tin nhắn</span>{messageCount > 0 && <span className="sidebar-count">{messageCount > 99 ? "99+" : messageCount}</span>}</NavLink>
          <NavLink className={navClass} to="/friends"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c0-3.6 3-6 6.5-6s6.5 2.4 6.5 6M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.3c2.2.7 3.5 2.6 3.5 5.7" /></svg><span className="menu-item-label">Kết bạn</span>{requestCount > 0 && <span className="sidebar-count">{requestCount > 99 ? "99+" : requestCount}</span>}</NavLink>
          {currentUser?._id && <NavLink className={navClass} to={"/profile/" + currentUser._id} end><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.5" /><path d="M4.5 20c0-4 3.2-6.5 7.5-6.5s7.5 2.5 7.5 6.5" /></svg><span className="menu-item-label">Trang cá nhân</span></NavLink>}
          <NavLink className={navClass} to="/saved"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4.5L5 21V4a1 1 0 0 1 1-1z" /></svg>Đã lưu</NavLink>
          <NavLink className={navClass} to="/settings"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h10m4 0h2M4 17h2m4 0h10" /><circle cx="16" cy="7" r="2" /><circle cx="8" cy="17" r="2" /></svg>Cài đặt</NavLink>
          {currentUser?.isAdmin && <NavLink className={navClass} to="/admin"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 4 6v5c0 5 3.4 8 8 10 4.6-2 8-5 8-10V6z" /><path d="m9 12 2 2 4-4" /></svg>Quản trị</NavLink>}
        </nav>
      </aside>
      <section className="home-content">
        <div className={"home-columns " + (isFeed ? "" : "home-columns-single")}><Outlet context={outletContext} /></div>
      </section>
    </main>
    </ConfirmProvider>
  );
}

export default AppLayout;
