import { useEffect, useMemo, useState } from "react";

function MessagesView({ currentUser, reloadKey }) {
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageContent, setMessageContent] = useState("");
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");

  const activeConversation = useMemo(
    () => conversations.find((item) => item._id === activeConversationId),
    [conversations, activeConversationId]
  );
  const otherParticipant = activeConversation?.participants?.find(
    (participant) => participant._id !== currentUser?._id
  );

  useEffect(() => {
    const controller = new AbortController();
    async function loadConversations() {
      setError("");
      try {
        const token = localStorage.getItem("token");
        const response = await fetch("http://localhost:5000/api/message/conversations", {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || "Không thể tải danh sách hội thoại.");
        }
        setError("");
        setConversations(data.conversations);
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
  }, [reloadKey]);

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
          `http://localhost:5000/api/message/conversation/${activeConversationId}/messages`,
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
          `http://localhost:5000/api/message/conversation/${activeConversationId}/read`,
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
        `http://localhost:5000/api/message/conversation/${activeConversationId}/messages`,
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
  }

  return (
    <section className="messages-view" aria-label="Tin nhắn">
      <aside className="conversation-list">
        <h1>Tin nhắn</h1>
        {isLoadingConversations && <p>Đang tải hội thoại...</p>}
        {!isLoadingConversations && conversations.length === 0 && (
          <p className="empty-conversations">Bạn chưa có hội thoại nào. Hãy kết bạn để bắt đầu nhắn tin.</p>
        )}
        {conversations.map((conversation) => {
          const participant = conversation.participants?.find(
            (person) => person._id !== currentUser?._id
          );
          return (
            <button
              className={`conversation-item ${activeConversationId === conversation._id ? "active" : ""}`}
              key={conversation._id}
              type="button"
              onClick={() => handleSelectConversation(conversation._id)}
            >
              <span className="person-avatar">
                {participant?.profilePicture ? (
                  <img src={participant.profilePicture} alt="" />
                ) : (participant?.username?.charAt(0).toUpperCase() || "?")}
              </span>
              <span className="conversation-summary">
                <strong>{participant?.username || "Người dùng"}</strong>
                <span>{conversation.lastMessage?.content || "Chưa có tin nhắn"}</span>
              </span>
              {conversation.unreadCount > 0 && (
                <span className="unread-count">{conversation.unreadCount}</span>
              )}
            </button>
          );
        })}
      </aside>

      <section className="conversation-panel">
        {activeConversation ? (
          <>
            <header className="conversation-header">
              <span className="person-avatar">
                {otherParticipant?.profilePicture ? (
                  <img src={otherParticipant.profilePicture} alt="" />
                ) : (otherParticipant?.username?.charAt(0).toUpperCase() || "?")}
              </span>
              <strong>{otherParticipant?.username || "Người dùng"}</strong>
            </header>
            <div className="message-list" aria-live="polite">
              {isLoadingMessages && <p>Đang tải tin nhắn...</p>}
              {!isLoadingMessages && messages.length === 0 && (
                <p className="empty-messages">Hãy gửi lời chào đầu tiên.</p>
              )}
              {messages.map((message) => {
                const isMine = message.senderId?._id === currentUser?._id;
                return (
                  <div className={`message-bubble ${isMine ? "mine" : "theirs"}`} key={message._id}>
                    {message.content}
                  </div>
                );
              })}
            </div>
            <form className="message-compose" onSubmit={handleSendMessage}>
              <input
                value={messageContent}
                onChange={(event) => setMessageContent(event.target.value)}
                placeholder="Viết tin nhắn..."
                maxLength="2000"
                aria-label="Nội dung tin nhắn"
              />
              <button type="submit" disabled={isSending || !messageContent.trim()}>
                {isSending ? "Đang gửi..." : "Gửi"}
              </button>
            </form>
          </>
        ) : (
          <div className="empty-messages">Chọn một hội thoại để xem tin nhắn.</div>
        )}
        {error && <p className="feedback-message error messages-error">{error}</p>}
      </section>
    </section>
  );
}

export default MessagesView;
