import { resolveMediaUrl } from "./lib/api.js";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { gsap } from "gsap";
import { API_BASE } from "./lib/api.js";
import { ConfirmProvider } from "./components/ConfirmDialog.jsx";
import UserSearch from "./components/UserSearch.jsx";
import LiveToast from "./components/LiveToast.jsx";
import { reactionInfo } from "./lib/reactions.js";
import Lenis from "lenis";
import { connectSocket, disconnectSocket, getSocket } from "./lib/socket.js";
import "./newsfeed.css";

const NOTIFICATION_TEXT = {
  like: "đã thích bài viết của bạn",
  comment: "đã bình luận bài viết của bạn",
  friend_request: "đã gửi lời mời kết bạn",
  friend_accept: "đã chấp nhận lời mời kết bạn",
  friend_reject: "đã từ chối lời mời kết bạn",
  message: "đã gửi tin nhắn cho bạn",
  share: "đã chia sẻ bài viết của bạn",
  reply: "đã trả lời bình luận của bạn",
  mention: "đã nhắc đến bạn trong một bình luận",
};

const REACTION_NOTIFICATION_TEXT = {
  like: "đã thích",
  love: "đã yêu thích",
  haha: "đã thả Haha cho",
  wow: "đã thả Wow cho",
  sad: "đã thả cảm xúc Buồn cho",
  angry: "đã thả cảm xúc Phẫn nộ cho",
};

function notificationText(type, reaction, commentId) {
  if ((type === "like" || type === "story_reaction") && reaction && REACTION_NOTIFICATION_TEXT[reaction]) {
    return `${REACTION_NOTIFICATION_TEXT[reaction]} ${type === "story_reaction" ? "story" : commentId ? "bình luận" : "bài viết"} của bạn`;
  }
  return NOTIFICATION_TEXT[type] || "có cập nhật mới";
}

function notificationTime(value) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 1) return "Vừa xong";
  if (minutes < 60) return `${minutes} phút`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)} giờ`;
  if (minutes < 2880) return "Hôm qua";
  return `${Math.floor(minutes / 1440)} ngày`;
}

function NotificationItem({ item, onOpen, onDelete }) {
  const sender = item.senderId && typeof item.senderId === "object" ? item.senderId : {};
  const post = item.postId && typeof item.postId === "object" && item.postId.status !== "deleted" ? item.postId : null;
  const comment = item.commentId && typeof item.commentId === "object" ? item.commentId : null;
  const hasPost = ["like", "comment", "reply", "mention", "share"].includes(item.type);
  const preview = item.type === "story_reaction" ? "Story" : !hasPost ? (item.type === "message" ? "Tin nhắn" : "") : !post ? "Bài viết đã bị xóa" : ["comment", "reply", "mention"].includes(item.type) && comment?.content
    ? comment.content : post.content?.trim() || (post.video ? "Video" : post.image ? "Ảnh" : "Bài viết");
  const reaction = item.type === "like" ? reactionInfo(item.reaction)?.emoji : null;
  const badgePath = ["comment", "reply", "mention"].includes(item.type) ? "M20 15a3 3 0 0 1-3 3H9l-5 4V6a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3z"
    : item.type === "story_reaction" ? "M12 21s-8-4.5-8-11a4 4 0 0 1 8-1 4 4 0 0 1 8 1c0 6.5-8 11-8 11z"
    : item.type === "share" ? "M22 3 11 14M22 3l-7 18-4-7-7-4z"
      : item.type.startsWith("friend_") ? "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8M4 21v-1a8 8 0 0 1 16 0v1" : null;
  return <div className={`notification-item ${item.isRead ? "read" : "unread"}`} role="button" tabIndex={0} onClick={() => onOpen(item)} onKeyDown={(event) => { if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); onOpen(item); } }}>
    <span className="notification-avatar">{sender.profilePicture ? <img src={resolveMediaUrl(sender.profilePicture)} alt="" /> : (sender.username?.charAt(0).toUpperCase() || "?")}<span className="notification-kind">{reaction || (badgePath ? <svg viewBox="0 0 24 24" aria-hidden="true"><path d={badgePath} /></svg> : "•")}</span></span>
    <span className="notification-copy"><span><strong>{sender.username || "Người dùng"}</strong> {notificationText(item.type, item.reaction, item.commentId)}</span><span className="notification-preview">{preview}</span><time>{notificationTime(item.createdAt)}</time></span>
    {post?.image ? <img className="notification-thumb" src={resolveMediaUrl(post.image)} alt="" /> : post?.video ? <span className="notification-thumb notification-video" aria-label="Video"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 5 12 7-12 7z" /></svg></span> : null}
    {!item.isRead && <span className="notification-unread-dot" />}
    <button className="notification-delete" type="button" aria-label="Xóa thông báo" onClick={(event) => { event.stopPropagation(); onDelete(item); }}>✕</button>
  </div>;
}

function signOutLocal(stopHeartbeat, userId, navigate) {
  stopHeartbeat();
  disconnectSocket();
  try {
    if (userId) {
      localStorage.removeItem(`ridge:recent-searches:${userId}`);
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

function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const lenis = new Lenis({ autoRaf: true, prevent: (node) => node.closest('[data-lenis-prevent], [role="dialog"], .ridge-dialog-backdrop, .ridge-share-backdrop, .story-viewer-backdrop') !== null || ["auto", "scroll"].includes(getComputedStyle(node).overflowY) });
    return () => lenis.destroy();
  }, []);
  const [currentUser, setCurrentUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [messageCount, setMessageCount] = useState(0);
  const [requestCount, setRequestCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notificationError, setNotificationError] = useState("");
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [liveToast, setLiveToast] = useState(null);
  const stopHeartbeatRef = useRef(() => {});
  const refreshCountsRef = useRef(() => {});
  const currentUserIdRef = useRef("");
  const navigateRef = useRef(navigate);
  const activeConversationIdRef = useRef(null);
  const mutedConversationIdsRef = useRef(new Set());
  const isFeed = location.pathname === "/feed";

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${API_BASE}/api/user/me`, {
      headers: { Authorization: "Bearer " + localStorage.getItem("token") },
      signal: controller.signal,
    }).then(async (response) => {
      if (response.status === 401) {
        signOutLocal(stopHeartbeatRef.current, currentUserIdRef.current, navigateRef.current);
        return;
      }
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Không thể tải hồ sơ.");
      setCurrentUser(data.user);
    }).catch((error) => {
      if (error.name !== "AbortError") setCurrentUser(null);
    });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    let stopped = false;
    let lastSentAt = 0;
    const controllers = new Set();

    function sendHeartbeat() {
      const now = Date.now();
      if (stopped || now - lastSentAt < 1000) return;
      lastSentAt = now;
      try {
        const controller = new AbortController();
        controllers.add(controller);
        fetch(`${API_BASE}/api/user/heartbeat`, {
          method: "POST",
          headers: { Authorization: "Bearer " + localStorage.getItem("token") },
          signal: controller.signal,
        }).then((response) => {
          if (response.status === 401) signOutLocal(stopHeartbeatRef.current, currentUserIdRef.current, navigateRef.current);
        }).catch(() => {}).finally(() => controllers.delete(controller));
      } catch {
        // Heartbeat failures are intentionally silent.
      }
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") sendHeartbeat();
    }

    sendHeartbeat();
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") sendHeartbeat();
    }, 60_000);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    function stopHeartbeat() {
      stopped = true;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      controllers.forEach((controller) => controller.abort());
      controllers.clear();
    }

    stopHeartbeatRef.current = stopHeartbeat;
    return () => {
      stopHeartbeat();
      stopHeartbeatRef.current = () => {};
    };
  }, []);

  useEffect(() => {
    currentUserIdRef.current = currentUser?._id || "";
  }, [currentUser?._id]);

  useEffect(() => {
    navigateRef.current = navigate;
  }, [navigate]);

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
        mutedConversationIdsRef.current = new Set((messages.conversations || []).filter((item) => item.isMuted).map((item) => item._id));
        setMessageCount((messages.conversations || []).reduce((sum, item) => sum + Number(item.unreadCount || 0), 0));
        setRequestCount((requests.request || []).length);
      } catch {
        // Badge counts are optional.
      } finally {
        busy = false;
      }
    }
    refreshCountsRef.current = refreshCounts;
    refreshCounts();
    // Realtime events keep the badges fresh; poll slowly only as a fallback
    // while the socket connection is down.
    const interval = window.setInterval(() => {
      if (!getSocket().connected) refreshCounts();
    }, 30000);
    window.addEventListener("focus", refreshCounts);
    return () => {
      mounted = false;
      refreshCountsRef.current = () => {};
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshCounts);
    };
  }, []);

  useEffect(() => {
    const socket = connectSocket();
    let refreshTimer = 0;
    const scheduleRefresh = () => {
      window.clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(() => refreshCountsRef.current(), 250);
    };

    function handleNotification({ notification } = {}) {
      if (!notification?._id || notification.type === "message") return;
      setNotifications((items) => items.some((item) => item._id === notification._id) ? items : [notification, ...items]);
      setLiveToast({
        kind: "notification",
        title: notification.senderId?.username || "Người dùng",
        body: notificationText(notification.type, notification.reaction, notification.commentId),
        avatar: notification.senderId?.profilePicture || "",
        notification,
      });
      if (notification.type === "friend_request" || notification.type === "friend_accept") scheduleRefresh();
    }

    function handleNewMessage({ conversationId, message } = {}) {
      scheduleRefresh();
      const senderId = message?.senderId?._id;
      if (!senderId || senderId === currentUserIdRef.current) return;
      if (mutedConversationIdsRef.current.has(conversationId)) return;
      if (conversationId === activeConversationIdRef.current) return;
      const preview = message.type === "post_share" ? "Đã gửi một bài viết"
        : message.type === "sticker" ? "Đã gửi một sticker"
          : String(message.content || "").slice(0, 80);
      setLiveToast({
        kind: "message",
        title: message.senderId?.username || "Người dùng",
        body: preview,
        avatar: message.senderId?.profilePicture || "",
        conversationId,
      });
    }

    function handleConversationUpdated({ conversationId, isMuted } = {}) {
      if (isMuted) mutedConversationIdsRef.current.add(conversationId);
      else mutedConversationIdsRef.current.delete(conversationId);
      scheduleRefresh();
    }

    // Resync after a dropped connection so nothing sent meanwhile is missed.
    let hasConnected = socket.connected;
    function handleConnect() {
      if (hasConnected) scheduleRefresh();
      hasConnected = true;
    }

    socket.on("notification:new", handleNotification);
    socket.on("message:new", handleNewMessage);
    socket.on("conversation:updated", handleConversationUpdated);
    socket.on("connect", handleConnect);
    const handleActiveConversation = (event) => { activeConversationIdRef.current = event.detail; };
    window.addEventListener("ridge:active-conversation", handleActiveConversation);
    window.addEventListener("ridge:counts-changed", scheduleRefresh);

    // Load existing notifications once so the bell shows unread items before it is opened.
    const controller = new AbortController();
    fetch(`${API_BASE}/api/notification`, {
      headers: { Authorization: "Bearer " + localStorage.getItem("token") },
      signal: controller.signal,
    }).then(async (response) => {
      const data = await response.json();
      if (response.ok) setNotifications((data.notifications || []).filter((item) => item.type !== "message"));
    }).catch(() => {});

    return () => {
      controller.abort();
      window.clearTimeout(refreshTimer);
      window.removeEventListener("ridge:active-conversation", handleActiveConversation);
      window.removeEventListener("ridge:counts-changed", scheduleRefresh);
      socket.off("notification:new", handleNotification);
      socket.off("message:new", handleNewMessage);
      socket.off("conversation:updated", handleConversationUpdated);
      socket.off("connect", handleConnect);
      disconnectSocket();
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
      setNotifications((data.notifications || []).filter((item) => item.type !== "message"));
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

  async function deleteNotification(item) {
    setNotifications((items) => items.filter((notification) => notification._id !== item._id));
    try {
      const response = await fetch(`${API_BASE}/api/notification/${item._id}`, {
        method: "DELETE",
        headers: { Authorization: "Bearer " + localStorage.getItem("token") },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Không thể xóa thông báo.");
    } catch (error) {
      setNotifications((items) => items.some((notification) => notification._id === item._id) ? items : [item, ...items]);
      setNotificationError(error.message);
    }
  }

  async function markAllRead() {
    const previous = notifications;
    setNotifications((items) => items.map((item) => ({ ...item, isRead: true })));
    try {
      const response = await fetch(`${API_BASE}/api/notification/read-all`, {
        method: "PATCH",
        headers: { Authorization: "Bearer " + localStorage.getItem("token") },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Không thể cập nhật thông báo.");
    } catch (error) {
      setNotifications(previous);
      setNotificationError(error.message);
    }
  }

  async function deleteAllNotifications() {
    if (!window.confirm("Xóa tất cả thông báo?")) return;
    const previous = notifications;
    setNotifications([]);
    try {
      const response = await fetch(`${API_BASE}/api/notification`, {
        method: "DELETE",
        headers: { Authorization: "Bearer " + localStorage.getItem("token") },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Không thể xóa thông báo.");
    } catch (error) {
      setNotifications(previous);
      setNotificationError(error.message);
    }
  }

  async function openNotification(item) {
    if (!item.isRead) await markRead(item._id);
    setNotificationOpen(false);
    const senderId = item.senderId?._id;
    if (["like", "comment", "reply", "mention", "share"].includes(item.type)) {
      if (!item.postId || typeof item.postId !== "object" || item.postId.status === "deleted") return;
      const commentId = item.commentId?._id || (typeof item.commentId === "string" ? item.commentId : "");
      navigate(`/post/${item.postId._id}${commentId ? `?comment=${commentId}` : ""}`);
    } else if (item.type === "friend_request") navigate("/friends");
    else if (["friend_accept", "friend_reject"].includes(item.type) && senderId) navigate(`/profile/${senderId}`);
    else if (item.type === "message") navigate("/messages");
  }

  function openLiveToast(toast) {
    setLiveToast(null);
    if (toast.notification) return openNotification(toast.notification);
    if (toast.kind === "message" && toast.conversationId) {
      navigate("/messages", { state: { openConversationId: toast.conversationId } });
    } else {
      setNotificationOpen(true);
    }
  }

  const notificationUnreadCount = notifications.filter((item) => item.type !== "message" && !item.isRead).length;
  const navClass = ({ isActive }) => "menu-item " + (isActive ? "active" : "");
  const menuRef = useRef(null);
  const activePillRef = useRef(null);
  const sidebarMotion = useRef(null);
  useLayoutEffect(() => {
    sidebarMotion.current = gsap.context(() => {}, menuRef);
    return () => sidebarMotion.current?.revert();
  }, []);
  useLayoutEffect(() => {
    const menu = menuRef.current;
    const pill = activePillRef.current;
    const active = menu?.querySelector(".menu-item.active");
    if (!menu || !pill || !active) return;
    menu.classList.add("has-active-pill");
    const x = active.offsetLeft;
    const y = active.offsetTop;
    const width = active.offsetWidth;
    const height = active.offsetHeight;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const initialized = pill.dataset.ready === "true";
    sidebarMotion.current?.add(() => {
      if (!initialized || reduced) gsap.set(pill, { x, y, width, height });
      else gsap.to(pill, { x, y, width, height, duration: 0.35, ease: "power3.out" });
    });
    pill.dataset.ready = "true";
  }, [location.pathname]);
  const outletContext = { currentUser, setCurrentUser, searchQuery, setSearchQuery };
  function handleLogout() {
    try {
      fetch(`${API_BASE}/api/auth/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      }).catch(() => {});
    } catch {
      // Continue local logout if the request cannot be started.
    }
    signOutLocal(stopHeartbeatRef.current, currentUser?._id, navigateRef.current);
  }
  return (
    <ConfirmProvider>
    <main className="home-layout">
      <header className="home-topbar">
        <div className="header-brand-search">
          <NavLink className="home-brand" to="/feed" aria-label="Ridge - về bảng tin" onClick={(event) => { if (location.pathname === "/feed") { event.preventDefault(); window.location.assign("/feed"); } else window.scrollTo(0, 0); }}><span className="home-brand-icon">R</span><span>Ridge</span></NavLink>
          <UserSearch key={currentUser?._id || "search-loading"} currentUser={currentUser} />
        </div>
        <div className="news-topbar-right">
          <NavLink className="header-icon-link" to="/messages" aria-label="Tin nhắn" title="Tin nhắn"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" /></svg>{messageCount > 0 && <span className="header-badge">{messageCount > 99 ? "99+" : messageCount}</span>}</NavLink>
          <div className="notification-wrap">
            <button className="header-icon-link notification-button" type="button" aria-label="Thông báo" aria-expanded={notificationOpen} onClick={toggleNotifications}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></svg>{notificationUnreadCount > 0 && <span className="header-badge">{notificationUnreadCount > 9 ? "9+" : notificationUnreadCount}</span>}</button>
            {notificationOpen && <div className="notification-panel" data-lenis-prevent><div className="notification-panel-header"><h2>Thông báo</h2>{notifications.some((item) => item.type !== "message") && <div className="notification-panel-actions"><button type="button" onClick={markAllRead}>Đánh dấu đã đọc</button><button type="button" onClick={deleteAllNotifications}>Xóa tất cả</button></div>}</div>{notificationError && <p className="feedback-message error">{notificationError}</p>}{!notifications.some((item) => item.type !== "message") && <p>Chưa có thông báo nào.</p>}{notifications.filter((item) => item.type !== "message").map((item) => <NotificationItem item={item} key={item._id} onOpen={openNotification} onDelete={deleteNotification} />)}</div>}
          </div>
          <div className="profile-menu-wrap">
            <button className="profile-menu-trigger" type="button" aria-label="Mở menu tài khoản" aria-expanded={profileMenuOpen} onClick={() => setProfileMenuOpen((open) => !open)}>
              <span className="user-avatar">{currentUser?.profilePicture ? <img src={resolveMediaUrl(currentUser.profilePicture)} alt="" /> : currentUser?.username?.charAt(0).toUpperCase()}</span>
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
        <nav className="home-menu" aria-label="Điều hướng chính" ref={menuRef}>
          <span className="sidebar-active-pill" ref={activePillRef} aria-hidden="true" />
          <NavLink className={navClass} to="/feed" end title="Bảng tin"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" /></svg><span className="menu-item-label">Bảng tin</span></NavLink>
          <NavLink className={navClass} to="/reels" end title="Reels"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2" /><path d="m10 9 5 3-5 3z" /></svg><span className="menu-item-label">Reels</span></NavLink>
          <NavLink className={navClass} to="/messages" title="Tin nhắn"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" /></svg><span className="menu-item-label">Tin nhắn</span>{messageCount > 0 && <span className="sidebar-count">{messageCount > 99 ? "99+" : messageCount}</span>}</NavLink>
          <NavLink className={navClass} to="/friends" title="Kết bạn"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c0-3.6 3-6 6.5-6s6.5 2.4 6.5 6M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.3c2.2.7 3.5 2.6 3.5 5.7" /></svg><span className="menu-item-label">Kết bạn</span>{requestCount > 0 && <span className="sidebar-count">{requestCount > 99 ? "99+" : requestCount}</span>}</NavLink>
          {currentUser?._id && <NavLink className={navClass} to={"/profile/" + currentUser._id} end title="Trang cá nhân"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.5" /><path d="M4.5 20c0-4 3.2-6.5 7.5-6.5s7.5 2.5 7.5 6.5" /></svg><span className="menu-item-label">Trang cá nhân</span></NavLink>}
          <NavLink className={navClass} to="/saved" title="Đã lưu"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4.5L5 21V4a1 1 0 0 1 1-1z" /></svg><span className="menu-item-label">Đã lưu</span></NavLink>
          <NavLink className={navClass} to="/settings" title="Cài đặt"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h10m4 0h2M4 17h2m4 0h10" /><circle cx="16" cy="7" r="2" /><circle cx="8" cy="17" r="2" /></svg><span className="menu-item-label">Cài đặt</span></NavLink>
          {currentUser?.isAdmin && <NavLink className={navClass} to="/admin" title="Quản trị"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 4 6v5c0 5 3.4 8 8 10 4.6-2 8-5 8-10V6z" /><path d="m9 12 2 2 4-4" /></svg><span className="menu-item-label">Quản trị</span></NavLink>}
        </nav>
      </aside>
      <section className="home-content">
        <div className={"home-columns route-motion " + (isFeed ? "" : "home-columns-single")} key={location.pathname}><Outlet context={outletContext} /></div>
      </section>
      <LiveToast toast={liveToast} onOpen={openLiveToast} onDismiss={() => setLiveToast(null)} />
    </main>
    </ConfirmProvider>
  );
}

export default AppLayout;
