import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { API_BASE } from "../lib/api.js";
import { getSocket } from "../lib/socket.js";
import ReactionButton from "./ReactionButton.jsx";
import EmojiStickerPicker from "./EmojiStickerPicker.jsx";
import { findSticker } from "../lib/stickers.js";
import { sendReaction, summarizeReactions } from "../lib/reactions.js";
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

function nicknameFor(conversation, userId) {
  return conversation?.nicknames?.find((item) => (item.user?._id || item.user) === userId)?.nickname;
}

const QUICK_ICONS = ["❤️", "👍", "😂", "😮", "😢", "🙏", "🔥", "⭐", "🎉", "😍", "👏", "💯"];
const THEMES = [
  { key: "cat", label: "Mèo", background: "peach", bubbleStyle: "cat-dog", image: "cat" },
  { key: "frog", label: "Ếch", background: "mint", bubbleStyle: "frog", image: "frog" },
  { key: "heart", label: "Tim hồng", background: "pink", bubbleStyle: "pink-heart", image: "heart" },
  { key: "dolphin", label: "Cá heo", background: "sky", bubbleStyle: "sky-fish", image: "dolphin" },
  { key: "seal", label: "Hải cẩu", background: "lavender", bubbleStyle: "duck", image: "seal" },
  { key: "panda", label: "Gấu trúc", background: "night", bubbleStyle: "dark", image: "panda" },
  { key: "sketch", label: "Phác thảo", background: "paper", bubbleStyle: "sketch", image: "" },
];

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
  const [typingConversationId, setTypingConversationId] = useState(null);
  const [syncTick, setSyncTick] = useState(0);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [nicknameDrafts, setNicknameDrafts] = useState({ me: "", other: "" });
  const messageListRef = useRef(null);
  const messageInputRef = useRef(null);
  const emojiToggleRef = useRef(null);
  const handledUserRequestRef = useRef("");
  const activeConversationIdRef = useRef(null);
  const conversationsRef = useRef([]);
  const incomingTypingTimerRef = useRef(0);
  const ownTypingRef = useRef({ active: false, lastSentAt: 0, timer: 0 });

  const filteredConversations = useMemo(() => conversations.filter((conversation) => {
    const participant = conversation.participants?.find((person) => person._id !== currentUser?._id);
    return normalizeName(nicknameFor(conversation, participant?._id) || participant?.username || "").includes(normalizeName(conversationSearch));
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
  const isOtherTyping = Boolean(activeConversationId) && typingConversationId === activeConversationId;
  const myNickname = nicknameFor(activeConversation, currentUser?._id);
  const otherNickname = nicknameFor(activeConversation, otherParticipant?._id);
  const shownOtherName = otherNickname || otherParticipant?.username || "Người dùng";

  async function saveNicknameChanges(clear = false) {
    const token = localStorage.getItem("token");
    const values = [[currentUser?._id, clear ? "" : nicknameDrafts.me], [otherParticipant?._id, clear ? "" : nicknameDrafts.other]];
    for (const [userId, nickname] of values) {
      const response = await fetch(`${API_BASE}/api/message/conversation/${activeConversationId}/nickname`, {
        method: "PATCH", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ userId, nickname }),
      });
      const data = await response.json();
      if (!response.ok) { setConversationActionError(data.message || "Không thể lưu biệt danh."); return; }
      setConversations((items) => items.map((item) => item._id === activeConversationId ? { ...item, nicknames: data.nicknames } : item));
    }
    window.dispatchEvent(new Event("ridge:counts-changed"));
  }

  async function toggleMute() {
    const muted = !activeConversation?.isMuted;
    const response = await fetch(`${API_BASE}/api/message/conversation/${activeConversationId}/mute`, {
      method: "PUT", headers: { Authorization: `Bearer ${localStorage.getItem("token")}`, "Content-Type": "application/json" },
      body: JSON.stringify({ muted }),
    });
    const data = await response.json();
    if (!response.ok) { setConversationActionError(data.message || "Không thể cập nhật thông báo."); return; }
    setConversations((items) => items.map((item) => item._id === activeConversationId ? { ...item, isMuted: data.isMuted, unreadCount: data.isMuted ? 0 : item.unreadCount } : item));
    window.dispatchEvent(new Event("ridge:counts-changed"));
  }
  async function saveQuickIcon(icon) {
    const response = await fetch(`${API_BASE}/api/message/conversation/${activeConversationId}/quick-icon`, {
      method: "PATCH", headers: { Authorization: `Bearer ${localStorage.getItem("token")}`, "Content-Type": "application/json" },
      body: JSON.stringify({ icon }),
    });
    const data = await response.json();
    if (!response.ok) { setConversationActionError(data.message || "Không thể cập nhật biểu tượng nhanh."); return; }
    setConversations((items) => items.map((item) => item._id === activeConversationId ? { ...item, quickIcon: data.quickIcon } : item));
  }
  async function saveAppearance(appearance) {
    const conversationId = activeConversationId;
    const previous = { background: activeConversation?.background || "", bubbleStyle: activeConversation?.bubbleStyle || "" };
    setConversationActionError("");
    setConversations((items) => items.map((item) => item._id === conversationId ? { ...item, ...appearance } : item));
    try {
      const response = await fetch(`${API_BASE}/api/message/conversation/${conversationId}/appearance`, {
        method: "PATCH", headers: { Authorization: `Bearer ${localStorage.getItem("token")}`, "Content-Type": "application/json" },
        body: JSON.stringify(appearance),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Không thể lưu giao diện cuộc trò chuyện.");
      setConversations((items) => items.map((item) => item._id === conversationId ? { ...item, ...data } : item));
    } catch (requestError) {
      setConversations((items) => items.map((item) => item._id === conversationId && item.background === appearance.background && item.bubbleStyle === appearance.bubbleStyle ? { ...item, ...previous } : item));
      setConversationActionError(requestError.message || "Không thể lưu giao diện cuộc trò chuyện.");
    }
  }
  const lastOwnMessageId = useMemo(() => {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      if (messages[index].senderId?._id === currentUser?._id) return messages[index]._id;
    }
    return null;
  }, [messages, currentUser?._id]);

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
      setIsPickerOpen(false);
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
  }, [messages, isLoadingMessages, activeConversationId, isOtherTyping]);

  useEffect(() => {
    activeConversationIdRef.current = activeConversationId;
  }, [activeConversationId]);
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("ridge:active-conversation", { detail: activeConversationId }));
    return () => window.dispatchEvent(new CustomEvent("ridge:active-conversation", { detail: null }));
  }, [activeConversationId]);

  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  const loadConversations = useCallback(async (signal) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE}/api/message/conversations`, {
        headers: { Authorization: `Bearer ${token}` },
        signal,
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Không thể tải danh sách hội thoại.");
      }
      setError("");
      setConversations(data.conversations);
      if (initialConversationId && !activeConversationIdRef.current && data.conversations.some((item) => item._id === initialConversationId)) {
        setActiveConversationId(initialConversationId);
      }
    } catch (requestError) {
      if (requestError.name !== "AbortError") setError(requestError.message);
    } finally {
      setIsLoadingConversations(false);
    }
  }, [initialConversationId]);

  const markConversationRead = useCallback(async (conversationId) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE}/api/message/conversation/${conversationId}/read`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) return;
      setConversations((items) => items.map((item) =>
        item._id === conversationId ? { ...item, unreadCount: 0 } : item
      ));
      window.dispatchEvent(new Event("ridge:counts-changed"));
    } catch {
      // The next sync or incoming message retries.
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const initialLoadTimer = window.setTimeout(() => {
      void loadConversations(controller.signal);
    }, 0);
    // New data arrives over the socket; poll only while it is disconnected.
    const intervalId = window.setInterval(() => {
      if (!getSocket().connected) void loadConversations(controller.signal);
    }, 10000);
    return () => {
      window.clearTimeout(initialLoadTimer);
      controller.abort();
      window.clearInterval(intervalId);
    };
  }, [reloadKey, loadConversations, syncTick]);

  useEffect(() => {
    const socket = getSocket();
    const myId = currentUser?._id;

    function handleNewMessage({ conversationId, message } = {}) {
      if (!conversationId || !message?._id) return;
      const isMine = message.senderId?._id === myId;
      const isActive = conversationId === activeConversationIdRef.current;
      const isVisible = document.visibilityState === "visible";

      if (isActive) {
        setMessages((items) => items.some((item) => item._id === message._id) ? items : [...items, message]);
        if (!isMine) {
          setTypingConversationId((current) => current === conversationId ? null : current);
          if (isVisible) void markConversationRead(conversationId);
        }
      }

      if (!conversationsRef.current.some((item) => item._id === conversationId)) {
        void loadConversations();
        return;
      }
      setConversations((items) => items.map((item) => {
        if (item._id !== conversationId) return item;
        const countsAsUnread = !item.isMuted && !isMine && !(isActive && isVisible);
        return {
          ...item,
          lastMessage: message,
          updatedAt: message.createdAt,
          unreadCount: countsAsUnread ? (item.unreadCount || 0) + 1 : item.unreadCount || 0,
        };
      }).sort((left, right) => new Date(right.updatedAt) - new Date(left.updatedAt)));
    }

    function handleMessageRead({ conversationId, readAt } = {}) {
      if (!conversationId || conversationId !== activeConversationIdRef.current) return;
      setMessages((items) => items.map((item) =>
        item.senderId?._id === myId && !item.isRead ? { ...item, isRead: true, readAt } : item
      ));
    }

    function handleConversationUpdated({ conversationId, nicknames, isMuted, quickIcon, background, bubbleStyle } = {}) {
      setConversations((items) => items.map((item) => item._id === conversationId
        ? { ...item, nicknames: nicknames || item.nicknames, isMuted: Boolean(isMuted), unreadCount: isMuted ? 0 : item.unreadCount, ...(quickIcon !== undefined ? { quickIcon } : {}), ...(background !== undefined ? { background } : {}), ...(bubbleStyle !== undefined ? { bubbleStyle } : {}) }
        : item));
      window.dispatchEvent(new Event("ridge:counts-changed"));
    }

    function handleMessageReaction({ conversationId, messageId, reactions } = {}) {
      if (!conversationId || !messageId || conversationId !== activeConversationIdRef.current) return;
      setMessages((items) => items.map((item) => item._id === messageId ? { ...item, reactions } : item));
    }

    function handleTyping({ conversationId, userId, isTyping } = {}) {
      if (!conversationId || userId === myId) return;
      window.clearTimeout(incomingTypingTimerRef.current);
      if (!isTyping) {
        setTypingConversationId((current) => current === conversationId ? null : current);
        return;
      }
      setTypingConversationId(conversationId);
      // Safety net in case the "stop" event is lost.
      incomingTypingTimerRef.current = window.setTimeout(() => setTypingConversationId(null), 7000);
    }

    // After a dropped connection, reload anything that may have been missed.
    let hasConnected = socket.connected;
    function handleConnect() {
      if (hasConnected) setSyncTick((tick) => tick + 1);
      hasConnected = true;
    }

    function handleVisibility() {
      const activeId = activeConversationIdRef.current;
      if (document.visibilityState === "visible" && activeId) void markConversationRead(activeId);
    }

    socket.on("message:new", handleNewMessage);
    socket.on("conversation:updated", handleConversationUpdated);
    socket.on("message:read", handleMessageRead);
    socket.on("message:reaction", handleMessageReaction);
    socket.on("typing", handleTyping);
    socket.on("connect", handleConnect);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.clearTimeout(incomingTypingTimerRef.current);
      socket.off("message:new", handleNewMessage);
      socket.off("conversation:updated", handleConversationUpdated);
      socket.off("message:read", handleMessageRead);
      socket.off("message:reaction", handleMessageReaction);
      socket.off("typing", handleTyping);
      socket.off("connect", handleConnect);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [currentUser?._id, loadConversations, markConversationRead]);

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
        setMessages((current) => {
          // Keep messages the socket delivered while this request was in flight.
          const fetchedIds = new Set(orderedMessages.map((item) => item._id));
          const newestFetched = orderedMessages.length
            ? new Date(orderedMessages[orderedMessages.length - 1].createdAt)
            : 0;
          const extras = current.filter((item) => !fetchedIds.has(item._id) && new Date(item.createdAt) > newestFetched);
          return extras.length ? [...orderedMessages, ...extras] : orderedMessages;
        });

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
          window.dispatchEvent(new Event("ridge:counts-changed"));
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
    // New messages arrive over the socket; poll only while it is disconnected.
    const intervalId = window.setInterval(() => {
      if (!getSocket().connected) loadMessages();
    }, 5000);
    return () => {
      controller.abort();
      window.clearInterval(intervalId);
    };
  }, [activeConversationId, syncTick]);

  const stopTyping = useCallback((conversationId = activeConversationIdRef.current) => {
    const state = ownTypingRef.current;
    window.clearTimeout(state.timer);
    if (state.active && conversationId) getSocket().emit("typing:stop", { conversationId });
    state.active = false;
  }, []);

  function applyMessageValue(value) {
    setMessageContent(value);
    if (!activeConversationId) return;
    if (!value.trim()) {
      stopTyping(activeConversationId);
      return;
    }
    const state = ownTypingRef.current;
    const now = Date.now();
    if (!state.active || now - state.lastSentAt > 2500) {
      getSocket().emit("typing:start", { conversationId: activeConversationId });
      state.active = true;
      state.lastSentAt = now;
    }
    window.clearTimeout(state.timer);
    state.timer = window.setTimeout(() => stopTyping(activeConversationId), 4000);
  }

  function handleMessageInput(event) {
    applyMessageValue(event.target.value);
  }

  const closePicker = useCallback((restoreFocus) => {
    setIsPickerOpen(false);
    if (restoreFocus === true) emojiToggleRef.current?.focus();
  }, []);

  function handleInsertEmoji(emoji) {
    const input = messageInputRef.current;
    const start = input?.selectionStart ?? messageContent.length;
    const end = input?.selectionEnd ?? start;
    const next = `${messageContent.slice(0, start)}${emoji}${messageContent.slice(end)}`;
    if (next.length > 2000) return;
    applyMessageValue(next);
    const caret = start + emoji.length;
    window.requestAnimationFrame(() => {
      input?.focus();
      input?.setSelectionRange(caret, caret);
    });
  }

  async function handleReactMessage(message, type) {
    const conversationId = activeConversationIdRef.current;
    if (!conversationId) return;
    try {
      const data = await sendReaction(`/api/message/conversation/${conversationId}/messages/${message._id}/reaction`, type);
      setMessages((items) => items.map((item) => item._id === message._id ? { ...item, reactions: data.reactions } : item));
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  // Sends a text message ({ content }) or a sticker ({ stickerId }). Returns true on success.
  async function submitMessage(body) {
    if (!activeConversationId) return false;

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
          body: JSON.stringify(body),
        }
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Không thể gửi tin nhắn.");
      }
      // The socket may deliver this message before the HTTP response does.
      setMessages((items) => items.some((item) => item._id === data.newMessage._id) ? items : [...items, data.newMessage]);
      stopTyping(activeConversationId);
      setConversations((items) => items.map((item) =>
        item._id === activeConversationId
          ? { ...item, lastMessage: data.newMessage, updatedAt: data.newMessage.createdAt }
          : item
      ).sort((left, right) => new Date(right.updatedAt) - new Date(left.updatedAt)));
      return true;
    } catch (requestError) {
      setError(requestError.message);
      return false;
    } finally {
      setIsSending(false);
    }
  }

  async function handleSendMessage(event) {
    event.preventDefault();
    const content = messageContent.trim() || activeConversation?.quickIcon || "";
    if (!content || !activeConversationId) return;
    if (await submitMessage({ content })) setMessageContent("");
  }

  async function handleSendSticker(stickerId) {
    setIsPickerOpen(false);
    await submitMessage({ stickerId });
  }

  function handleSelectConversation(conversationId) {
    if (conversationId !== activeConversationId) {
      stopTyping(activeConversationId);
      setMessages([]);
      setIsPickerOpen(false);
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
          <div className="ridge-conversation-scroll ridge-friend-picker-list" data-lenis-prevent>
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
          <div className="ridge-conversation-scroll" data-lenis-prevent>
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
                    <span className="ridge-conversation-top"><span className="ridge-conversation-name">{nicknameFor(conversation, participant?._id) || participant?.username || "Người dùng"}</span>{conversation.isMuted && <svg className="ridge-muted-icon" viewBox="0 0 24 24" role="img" aria-label="Đã tắt thông báo"><path d="M18 9a6 6 0 0 0-10.8-3.6M6 9c0 7-3 7-3 9h18c0-1.2-1-1.8-1.8-3M3 3l18 18M10 21h4" /></svg>}{conversationTime && <time className="ridge-conversation-time">{conversationTime}</time>}</span>
                    <span className="ridge-conversation-bottom"><span className="ridge-conversation-preview">{lastMessageText}</span>{!conversation.isMuted && conversation.unreadCount > 0 && <span className="unread-count ridge-unread-count" aria-label={`${conversation.unreadCount} tin nhắn chưa đọc`}>{conversation.unreadCount}</span>}</span>
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

      <section className={`conversation-panel ridge-conversation-panel${activeConversation?.bubbleStyle ? ` bubble-style-${activeConversation.bubbleStyle}` : ""}${activeConversation?.background ? ` chat-bg-${activeConversation.background}` : ""}`}>
        {activeConversation ? (
          <>
            <header className="conversation-header ridge-conversation-header">
              <button className="ridge-back-button" type="button" onClick={() => setShowChatPane(false)}>Quay lại</button>
              <Link className="person-avatar" to={`/profile/${otherParticipant?._id}`} aria-label={`Xem trang cá nhân ${otherParticipant?.username || "người dùng"}`}>
                {otherParticipant?.profilePicture ? (
                  <img src={otherParticipant.profilePicture} alt="" />
                ) : (otherParticipant?.username?.charAt(0).toUpperCase() || "?")}
              </Link>
              <Link className="ridge-chat-title" to={`/profile/${otherParticipant?._id}`}>{shownOtherName}</Link>
              <div className="ridge-chat-settings-wrap">
                <button className="ridge-chat-settings-button" type="button" aria-label="Cài đặt cuộc trò chuyện" aria-expanded={settingsOpen} onClick={() => { setNicknameDrafts({ me: myNickname || "", other: otherNickname || "" }); setSettingsOpen((open) => !open); }}>···</button>
                {settingsOpen && <div className="ridge-chat-settings" role="dialog" aria-label="Cài đặt cuộc trò chuyện">
                  <strong>Đặt biệt danh</strong>
                  {conversationActionError && <p className="ridge-list-error" role="alert">{conversationActionError}</p>}
                  <label>Bạn <small>{currentUser?.username}</small><input maxLength="40" value={nicknameDrafts.me} onChange={(event) => setNicknameDrafts((draft) => ({ ...draft, me: event.target.value }))} /></label>
                  <label>{shownOtherName} <small>{otherParticipant?.username}</small><input maxLength="40" value={nicknameDrafts.other} onChange={(event) => setNicknameDrafts((draft) => ({ ...draft, other: event.target.value }))} /></label>
                  <div className="ridge-chat-settings-actions"><button type="button" onClick={() => void saveNicknameChanges()}>Lưu</button><button type="button" onClick={() => void saveNicknameChanges(true)}>Xóa</button></div>
                  <label className="ridge-mute-toggle"><input type="checkbox" checked={Boolean(activeConversation.isMuted)} onChange={() => void toggleMute()} />Tắt thông báo</label>
                  <strong>Biểu tượng nhanh</strong>
                  <div className="ridge-quick-icons" aria-label="Chọn biểu tượng nhanh">{QUICK_ICONS.map((icon) => <button key={icon} type="button" aria-label={icon} aria-pressed={activeConversation.quickIcon === icon} onClick={() => void saveQuickIcon(icon)}>{icon}</button>)}</div>
                  <button className="ridge-quick-icon-reset" type="button" onClick={() => void saveQuickIcon("")}>Đặt lại</button>
                  <strong>Chủ đề</strong>
                  <div className="ridge-appearance-options ridge-theme-options" aria-label="Chọn chủ đề">
                    {THEMES.map(({ key, label, background, bubbleStyle, image }) => <button key={key} className={`ridge-theme-chip chat-bg-${background} bubble-preview-${bubbleStyle}`} type="button" aria-pressed={activeConversation.background === background && activeConversation.bubbleStyle === bubbleStyle} onClick={() => void saveAppearance({ background, bubbleStyle })}>{image && <img src={`/chat-art/${image}.webp`} alt="" />}<span>{label}</span></button>)}
                    <button className="ridge-appearance-reset" type="button" aria-pressed={!activeConversation.background && !activeConversation.bubbleStyle} onClick={() => void saveAppearance({ background: "", bubbleStyle: "" })}>Mặc định</button>
                  </div>
                </div>}
              </div>
            </header>
            <div className={`message-list ridge-message-list${activeConversation.background ? ` chat-bg-${activeConversation.background}` : ""}`} data-lenis-prevent aria-live="polite" ref={messageListRef}>
              {isLoadingMessages && <p className="ridge-message-state">Đang tải tin nhắn...</p>}
              {!isLoadingMessages && messages.length === 0 && (
                <p className="empty-messages">Hãy gửi lời chào đầu tiên.</p>
              )}
              {messages.map((message) => {
                const isMine = message.senderId?._id === currentUser?._id;
                const reactionSummary = summarizeReactions(message.reactions, currentUser?._id);
                const sticker = message.type === "sticker" ? findSticker(message.stickerId) : null;
                return (
                  <Fragment key={message._id}>
                    <div className={`ridge-message-row ${isMine ? "mine" : "theirs"}`}>
                      <div className={`ridge-msg-bubble-wrap ${reactionSummary.total > 0 ? "has-reactions" : ""}`}>
                        {!isMine && <span className="ridge-message-sender-name">{shownOtherName}</span>}
                        <div className={`message-bubble ridge-message-bubble ${isMine ? "mine" : "theirs"}${message.type === "sticker" ? " sticker" : ""}${message.type === "post_share" ? " post-share" : ""}${message.type !== "sticker" && message.type !== "post_share" && Boolean(message.content?.trim()) && /^[\p{Extended_Pictographic}\p{Emoji_Modifier}\uFE0F\u200D\s]+$/u.test(message.content.trim()) ? " emoji-only" : ""}`}>
                          {sticker ? <img className="ridge-sticker-img" src={sticker.src} alt={sticker.label} /> : message.type === "post_share" ? <Link className="ridge-shared-post" to={message.sharedPostId?._id ? `/post/${message.sharedPostId._id}` : "#"} onClick={(event) => { if (!message.sharedPostId?._id) event.preventDefault(); }}>
                            {message.sharedPostId ? <><span className="ridge-shared-post-author">{message.sharedPostId.authorId?.profilePicture ? <img src={message.sharedPostId.authorId.profilePicture} alt="" /> : <span className="ridge-shared-post-initial">{message.sharedPostId.authorId?.username?.[0]?.toUpperCase() || "?"}</span>}<strong>{message.sharedPostId.authorId?.username || "Người dùng"}</strong></span>{message.sharedPostId.content && <span className="ridge-shared-post-text">{message.sharedPostId.content}</span>}{(message.sharedPostId.image || message.sharedPostId.video) && <span className="ridge-shared-post-media">{message.sharedPostId.image ? <img src={message.sharedPostId.image} alt="" /> : <><video src={message.sharedPostId.video} preload="metadata" muted playsInline /><span className="ridge-shared-post-play" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg></span></>}</span>}</> : "Bài viết không còn khả dụng"}
                          </Link> : message.content}
                          <time className="ridge-message-time" dateTime={message.createdAt}>{formatMessageTime(message.createdAt)}</time>
                        </div>
                        {reactionSummary.total > 0 && (
                          <button
                            type="button"
                            className={`ridge-msg-badge ${reactionSummary.mine ? "mine" : ""}`}
                            aria-label={`${reactionSummary.total} cảm xúc. Bấm để ${reactionSummary.mine ? "bỏ cảm xúc của bạn" : "thả cùng cảm xúc"}.`}
                            onClick={() => void handleReactMessage(message, reactionSummary.mine ? null : reactionSummary.top[0].type)}
                          >
                            <span aria-hidden="true">{reactionSummary.top.slice(0, 3).map((item) => item.emoji).join("")}</span>
                            {reactionSummary.total > 1 && <span className="ridge-msg-badge-count">{reactionSummary.total}</span>}
                          </button>
                        )}
                      </div>
                      <div className="ridge-msg-actions">
                        <ReactionButton
                          compact
                          iconOnly
                          mine={reactionSummary.mine}
                          idleLabel="Thả cảm xúc"
                          idleIcon={<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M8.5 14.5a4.5 4.5 0 0 0 7 0M9 9.5h.01M15 9.5h.01" /></svg>}
                          onReact={(type) => void handleReactMessage(message, type)}
                        />
                      </div>
                    </div>
                    {message._id === lastOwnMessageId && (
                      <span className="ridge-message-status">{message.isRead ? "Đã xem" : "Đã gửi"}</span>
                    )}
                  </Fragment>
                );
              })}
              {isOtherTyping && (
                <div className="ridge-typing" role="status">
                  <span className="ridge-typing-dots" aria-hidden="true"><span /><span /><span /></span>
                  <span>{shownOtherName} đang nhập...</span>
                </div>
              )}
            </div>
            <form className="message-compose ridge-message-compose" onSubmit={handleSendMessage}>
              <button
                className="ridge-emoji-toggle"
                type="button"
                ref={emojiToggleRef}
                aria-label="Chọn biểu tượng và nhãn dán"
                aria-haspopup="dialog"
                aria-expanded={isPickerOpen}
                title="Biểu tượng và nhãn dán"
                onClick={() => setIsPickerOpen((open) => !open)}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M8.5 14.5a4.5 4.5 0 0 0 7 0M9 9.5h.01M15 9.5h.01" /></svg>
              </button>
              <label className="ridge-visually-hidden" htmlFor="message-content">Nội dung tin nhắn</label>
              <input
                id="message-content"
                ref={messageInputRef}
                value={messageContent}
                onChange={handleMessageInput}
                placeholder="Viết tin nhắn..."
                maxLength="2000"
              />
              <button type="submit" aria-label={messageContent.trim() ? "Gửi" : activeConversation.quickIcon ? `Gửi ${activeConversation.quickIcon}` : "Gửi"} disabled={isSending || (!messageContent.trim() && !activeConversation.quickIcon)}>
                {messageContent.trim() || !activeConversation.quickIcon ? <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m22 2-7 20-4-9-9-4 20-7Z"/><path d="M22 2 11 13"/></svg> : <span aria-hidden="true">{activeConversation.quickIcon}</span>}
                <span className="ridge-visually-hidden">{isSending ? "Đang gửi..." : "Gửi"}</span>
              </button>
            </form>
            {isPickerOpen && (
              <EmojiStickerPicker
                toggleRef={emojiToggleRef}
                onClose={closePicker}
                onPickEmoji={handleInsertEmoji}
                onPickSticker={(stickerId) => void handleSendSticker(stickerId)}
              />
            )}
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
