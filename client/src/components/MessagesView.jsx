import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { API_BASE } from "../lib/api.js";
import "../messages.css";

function formatMessageTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit" }).format(date);
}

function normalizeName(value = "") {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/gi, "d").toLowerCase();
}

function MessagesView({ currentUser, reloadKey, initialConversationId }) {
  const location = useLocation();
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [showChatPane, setShowChatPane] = useState(Boolean(initialConversationId));
  const [messages, setMessages] = useState([]);
  const [messageContent, setMessageContent] = useState("");
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const [conversationActionError, setConversationActionError] = useState("");
  const [conversationSearch, setConversationSearch] = useState("");
  const [isFriendPickerOpen, setIsFriendPickerOpen] = useState(false);
  const [friends, setFriends] = useState([]);
  const [isLoadingFriends, setIsLoadingFriends] = useState(true);
  const [friendError, setFriendError] = useState("");
  const [friendSearch, setFriendSearch] = useState("");
  const messageListRef = useRef(null);
  const handledUserRequestRef = useRef("");

  const filteredConversations = useMemo(() => conversations.filter((conversation) => {
    const participant = conversation.participants?.find((person) => person._id !== currentUser?._id);
    return normalizeName(participant?.username || "").includes(normalizeName(conversationSearch));
  }), [conversations, currentUser?._id, conversationSearch]);
  const filteredFriends = useMemo(() => friends.filter((friend) =>
    normalizeName(friend.username || "").includes(normalizeName(friendSearch))
  ), [friends, friendSearch]);

  const activeConversation = useMemo(
    () => conversations.find((item) => item._id === activeConversationId),
    [conversations, activeConversationId]
  );
  const otherParticipant = activeConversation?.participants?.find(
    (participant) => participant._id !== currentUser?._id
  );

  const loadFriends = useCallback(async () => {
    setIsLoadingFriends(true);
    setFriendError("");
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE}/api/friend`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Không thể tải danh sách bạn bè.");
      setFriends(data.friend || []);
    } catch (requestError) {
      setFriendError(requestError.message || "Không thể tải danh sách bạn bè.");
    } finally {
      setIsLoadingFriends(false);
    }
  }, []);

  const openOrCreateConversation = useCallback(async (userId, selectedFriend) => {
    if (!userId) return;
    setConversationActionError("");
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE}/api/message/conversation/${userId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Không thể mở cuộc trò chuyện.");
      const conversation = data.conversation;
      if (!conversation?._id) throw new Error("Không thể mở cuộc trò chuyện.");
      const friend = selectedFriend || friends.find((item) => item._id === userId) || { _id: userId, username: "Người dùng" };
      const conversationParticipants = conversation.participants?.filter((participant) => typeof participant === "object" && participant?._id) || [];
      setConversations((items) => {
        const existing = items.find((item) => item._id === conversation._id);
        if (existing) return items;
        return [{
          ...conversation,
          participants: conversationParticipants.length > 1 ? conversationParticipants : [currentUser, friend].filter(Boolean),
          unreadCount: conversation.unreadCount || 0,
        }, ...items];
      });
      setMessages([]);
      setActiveConversationId(conversation._id);
      setShowChatPane(true);
      setIsFriendPickerOpen(false);
      setFriendSearch("");
    } catch (requestError) {
      setConversationActionError(requestError.message || "Không thể mở cuộc trò chuyện.");
    }
  }, [currentUser, friends]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadFriends(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadFriends]);

  useEffect(() => {
    const requestedUserId = location.state?.openUserId;
    const requestKey = `${location.key}:${requestedUserId || ""}`;
    if (!requestedUserId || isLoadingConversations || isLoadingFriends || handledUserRequestRef.current === requestKey) return;
    handledUserRequestRef.current = requestKey;
    void openOrCreateConversation(requestedUserId);
  }, [location.key, location.state?.openUserId, isLoadingConversations, isLoadingFriends, openOrCreateConversation]);

  useEffect(() => {
    if (messageListRef.current) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
    }
  }, [messages, isLoadingMessages, activeConversationId]);

  useEffect(() => {
    const controller = new AbortController();
    async function loadConversations() {
      setError("");
      try {
        const token = localStorage.getItem("token");
        const response = await fetch(`${API_BASE}/api/message/conversations`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || "Không thể tải danh sách hội thoại.");
        }
        setError("");
        setConversations(data.conversations);
        if (initialConversationId && data.conversations.some((item) => item._id === initialConversationId)) {
          setActiveConversationId(initialConversationId);
        }
      } catch (requestError) {
        if (requestError.name !== "AbortError") setError(requestError.message);
      } finally {
        setIsLoadingConversations(false);
      }
    }

    loadConversations();
    const intervalId = window.setInterval(loadConversations, 10000);
    return () => {
      controller.abort();
      window.clearInterval(intervalId);
    };
  }, [reloadKey, initialConversationId]);

  useEffect(() => {
    if (!activeConversationId) {
      return undefined;
    }

    const controller = new AbortController();
    let isFirstLoad = true;
    let isLoadingRequest = false;
    async function loadMessages() {
      if (isLoadingRequest) return;
      isLoadingRequest = true;
      const showLoading = isFirstLoad;
      isFirstLoad = false;
      if (showLoading) setIsLoadingMessages(true);
      try {
        const token = localStorage.getItem("token");
        const response = await fetch(
          `${API_BASE}/api/message/conversation/${activeConversationId}/messages`,
          {
            headers: { Authorization: `Bearer ${token}` },
            signal: controller.signal,
          }
        );
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || "Không thể tải tin nhắn.");
        }
        setError("");
        const orderedMessages = [...data.message].sort(
          (left, right) => new Date(left.createdAt) - new Date(right.createdAt)
        );
        setMessages(orderedMessages);

        const readResponse = await fetch(
          `${API_BASE}/api/message/conversation/${activeConversationId}/read`,
          {
            method: "PATCH",
            headers: { Authorization: `Bearer ${token}` },
            signal: controller.signal,
          }
        );
        if (readResponse.ok) {
          setConversations((items) => items.map((item) =>
            item._id === activeConversationId ? { ...item, unreadCount: 0 } : item
          ));
        }
      } catch (requestError) {
        if (requestError.name !== "AbortError") {
          setError(requestError.message);
        }
      } finally {
        isLoadingRequest = false;
        if (showLoading && !controller.signal.aborted) {
          setIsLoadingMessages(false);
        }
      }
    }

    loadMessages();
    const intervalId = window.setInterval(loadMessages, 5000);
    return () => {
      controller.abort();
      window.clearInterval(intervalId);
    };
  }, [activeConversationId]);

  async function handleSendMessage(event) {
    event.preventDefault();
    const content = messageContent.trim();
    if (!content || !activeConversationId) return;

    setIsSending(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${API_BASE}/api/message/conversation/${activeConversationId}/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ content }),
        }
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Không thể gửi tin nhắn.");
      }
      setMessages((items) => [...items, data.newMessage]);
      setMessageContent("");
      setConversations((items) => items.map((item) =>
        item._id === activeConversationId
          ? { ...item, lastMessage: data.newMessage, updatedAt: data.newMessage.createdAt }
          : item
      ).sort((left, right) => new Date(right.updatedAt) - new Date(left.updatedAt)));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSending(false);
    }
  }

  function handleSelectConversation(conversationId) {
    if (conversationId !== activeConversationId) {
      setMessages([]);
    }
    setActiveConversationId(conversationId);
    setShowChatPane(true);
  }

  return (
    <section className={`messages-view ridge-messages ${showChatPane ? "show-chat" : ""}`} aria-label="Tin nhắn">
      <aside className="conversation-list ridge-conversation-list">
        {isFriendPickerOpen ? <>
          <header className="ridge-list-header ridge-list-header-picker">
            <button className="ridge-picker-back" type="button" onClick={() => { setIsFriendPickerOpen(false); setFriendSearch(""); }}>Quay lại</button>
            <h1>Tin nhắn mới</h1>
          </header>
          <label className="ridge-visually-hidden" htmlFor="message-friend-search">Tìm bạn bè</label>
          <input id="message-friend-search" className="ridge-list-search" type="search" aria-label="Tìm bạn bè" placeholder="Tìm bạn bè" value={friendSearch} onChange={(event) => setFriendSearch(event.target.value)} />
          <div className="ridge-conversation-scroll ridge-friend-picker-list">
            {isLoadingFriends && <p className="ridge-list-state" role="status">Đang tải bạn bè...</p>}
            {friendError && <p className="ridge-list-error" role="alert">{friendError}</p>}
            {conversationActionError && <p className="ridge-list-error" role="alert">{conversationActionError}</p>}
            {!isLoadingFriends && !friendError && filteredFriends.length === 0 && <p className="ridge-list-state">Không tìm thấy bạn bè nào.</p>}
            {filteredFriends.map((friend) => <button className="ridge-picker-friend" type="button" key={friend._id} onClick={() => { void openOrCreateConversation(friend._id, friend); }}>
              <span className="person-avatar ridge-avatar" aria-hidden="true">{friend.profilePicture ? <img src={friend.profilePicture} alt="" /> : (friend.username?.charAt(0).toUpperCase() || "?")}</span>
              <span>{friend.username || "Người dùng"}</span>
            </button>)}
          </div>
        </> : <>
          <header className="ridge-list-header">
            <h1>Tin nhắn</h1>
            <button className="ridge-new-message-button" type="button" aria-label="Tin nhắn mới" title="Tin nhắn mới" onClick={() => { setFriendSearch(""); setIsFriendPickerOpen(true); setShowChatPane(false); }}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
            </button>
          </header>
          <label className="ridge-visually-hidden" htmlFor="message-conversation-search">Tìm kiếm trên Tin nhắn</label>
          <input id="message-conversation-search" className="ridge-list-search" type="search" aria-label="Tìm kiếm trên Tin nhắn" placeholder="Tìm kiếm trên Tin nhắn" value={conversationSearch} onChange={(event) => setConversationSearch(event.target.value)} />
          <div className="ridge-conversation-scroll">
            {isLoadingConversations && <p className="ridge-list-state">Đang tải hội thoại...</p>}
            {conversationActionError && !showChatPane && <p className="ridge-list-error" role="alert">{conversationActionError}</p>}
            {!isLoadingConversations && conversations.length === 0 && !conversationSearch.trim() && (
              <p className="empty-conversations">{friends.length > 0 ? 'Bạn chưa có hội thoại nào. Chọn "Tin nhắn mới" để bắt đầu.' : isLoadingFriends ? "Đang tải bạn bè..." : "Bạn chưa có hội thoại nào. Hãy kết bạn để bắt đầu nhắn tin."}</p>
            )}
            {!isLoadingConversations && conversationSearch.trim() && filteredConversations.length === 0 && <p className="ridge-list-state">Không tìm thấy hội thoại nào.</p>}
            {filteredConversations.map((conversation) => {
            const participant = conversation.participants?.find(
              (person) => person._id !== currentUser?._id
            );
            const lastMessageText = conversation.lastMessage?.content || "Chưa có tin nhắn";
            const conversationTime = formatMessageTime(conversation.lastMessage?.createdAt || conversation.updatedAt);
            return (
              <div className="ridge-conversation-row" key={conversation._id}>
                <button
                  className={`conversation-item ridge-conversation-item ${activeConversationId === conversation._id ? "active" : ""}`}
                  type="button"
                  aria-current={activeConversationId === conversation._id ? "true" : undefined}
                  onClick={() => handleSelectConversation(conversation._id)}
                >
                  <span className="person-avatar ridge-avatar" aria-hidden="true">
                    {participant?.profilePicture ? <img src={participant.profilePicture} alt="" /> : (participant?.username?.charAt(0).toUpperCase() || "?")}
                  </span>
                  <span className="conversation-summary ridge-conversation-summary">
                    <span className="ridge-conversation-top"><span className="ridge-conversation-name">{participant?.username || "Người dùng"}</span>{conversationTime && <time className="ridge-conversation-time">{conversationTime}</time>}</span>
                    <span className="ridge-conversation-bottom"><span className="ridge-conversation-preview">{lastMessageText}</span>{conversation.unreadCount > 0 && <span className="unread-count ridge-unread-count" aria-label={`${conversation.unreadCount} tin nhắn chưa đọc`}>{conversation.unreadCount}</span>}</span>
                  </span>
                </button>
                <Link className="ridge-profile-link" to={`/profile/${participant?._id}`} aria-label={`Xem trang cá nhân ${participant?.username || "người dùng"}`}>
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 21a8 8 0 0 0-16 0"/><circle cx="12" cy="8" r="4"/></svg>
                </Link>
              </div>
            );
            })}
          </div>
        </>}
      </aside>

      <section className="conversation-panel ridge-conversation-panel">
        {activeConversation ? (
          <>
            <header className="conversation-header ridge-conversation-header">
              <button className="ridge-back-button" type="button" onClick={() => setShowChatPane(false)}>Quay lại</button>
              <Link className="person-avatar" to={`/profile/${otherParticipant?._id}`} aria-label={`Xem trang cá nhân ${otherParticipant?.username || "người dùng"}`}>
                {otherParticipant?.profilePicture ? (
                  <img src={otherParticipant.profilePicture} alt="" />
                ) : (otherParticipant?.username?.charAt(0).toUpperCase() || "?")}
              </Link>
              <Link to={`/profile/${otherParticipant?._id}`}>{otherParticipant?.username || "Người dùng"}</Link>
            </header>
            <div className="message-list ridge-message-list" aria-live="polite" ref={messageListRef}>
              {isLoadingMessages && <p className="ridge-message-state">Đang tải tin nhắn...</p>}
              {!isLoadingMessages && messages.length === 0 && (
                <p className="empty-messages">Hãy gửi lời chào đầu tiên.</p>
              )}
              {messages.map((message) => {
                const isMine = message.senderId?._id === currentUser?._id;
                return (
                  <div className={`message-bubble ridge-message-bubble ${isMine ? "mine" : "theirs"}`} key={message._id}>
                    {message.content}
                    <time className="ridge-message-time" dateTime={message.createdAt}>{formatMessageTime(message.createdAt)}</time>
                  </div>
                );
              })}
            </div>
            <form className="message-compose ridge-message-compose" onSubmit={handleSendMessage}>
              <label className="ridge-visually-hidden" htmlFor="message-content">Nội dung tin nhắn</label>
              <input
                id="message-content"
                value={messageContent}
                onChange={(event) => setMessageContent(event.target.value)}
                placeholder="Viết tin nhắn..."
                maxLength="2000"
              />
              <button type="submit" aria-label="Gửi" disabled={isSending || !messageContent.trim()}>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m22 2-7 20-4-9-9-4 20-7Z"/><path d="M22 2 11 13"/></svg>
                <span className="ridge-visually-hidden">{isSending ? "Đang gửi..." : "Gửi"}</span>
              </button>
            </form>
          </>
        ) : (
          <div className="empty-messages">Chọn một hội thoại để xem tin nhắn.</div>
        )}
        {(error || (conversationActionError && !isFriendPickerOpen)) && <p className="feedback-message error messages-error ridge-messages-error" role="alert">{conversationActionError || error}</p>}
      </section>
    </section>
  );
}

export default MessagesView;
