import { useEffect, useRef, useState } from "react";
import { API_BASE } from "../lib/api.js";
import { useModalBehavior } from "./ConfirmDialog.jsx";
import Toast from "./Toast.jsx";
import "../share-dialog.css";

export default function ShareDialog({ post, onShare, onClose }) {
  const dialogRef = useRef(null);
  const [friends, setFriends] = useState([]);
  const [selected, setSelected] = useState([]);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [toast, setToast] = useState("");
  const original = post.originalPostId && typeof post.originalPostId === "object" ? post.originalPostId : post;
  const originalId = typeof post.originalPostId === "string" ? post.originalPostId : post.originalPostId?._id || post._id;
  useModalBehavior(true, busy, onClose, null, dialogRef);
  useEffect(() => {
    fetch(`${API_BASE}/api/friend`, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } })
      .then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.message); setFriends(data.friend || []); })
      .catch((error) => setFeedback(error.message || "Không thể tải danh sách bạn bè."));
  }, []);

  async function send() {
    setBusy(true); setFeedback("");
    try {
      const response = await fetch(`${API_BASE}/api/post/${originalId}/send`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` }, body: JSON.stringify({ recipientIds: selected, ...(message.trim() ? { message: message.trim() } : {}) }) });
      const data = await response.json();
      if (!response.ok && !data.failed) throw new Error(data.message || "Không thể gửi bài viết.");
      if (data.failed?.length) setFeedback(data.failed.map((item) => `${friends.find((friend) => friend._id === item.id)?.username || item.id}: ${item.reason}`).join("; "));
      if (data.sent?.length) setToast(`Đã gửi cho ${data.sent.length} người`);
      if (!data.sent?.length) setFeedback(data.failed?.map((item) => item.reason).join("; ") || "Không gửi được bài viết.");
    } catch (error) { setFeedback(error.message); } finally { setBusy(false); }
  }

  async function shareToFeed() {
    setBusy(true); setFeedback("");
    try { await onShare?.(post, caption); onClose(); }
    catch (error) { setFeedback(error.message || "Không thể chia sẻ bài viết."); }
    finally { setBusy(false); }
  }

  async function copyLink() {
    const url = `${location.origin}/post/${originalId}`;
    try { if (!navigator.clipboard?.writeText) throw new Error(); await navigator.clipboard.writeText(url); setToast("Đã sao chép liên kết"); }
    catch { setFeedback(url); }
  }

  return <div className="ridge-share-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}>
    <section className="ridge-share-dialog" role="dialog" aria-modal="true" aria-labelledby="share-dialog-title" ref={dialogRef} tabIndex="-1">
      <header><h2 id="share-dialog-title">Chia sẻ bài viết</h2><button type="button" aria-label="Đóng" onClick={onClose}>×</button></header>
      <div className="ridge-share-preview"><strong>{original.authorId?.username || "Người dùng"}</strong><p>{(original.content || "").split("\n")[0]}</p>{original.image ? <img src={original.image} alt="" /> : original.video ? <span aria-label="Video">▶ Video</span> : null}</div>
      <div className="ridge-share-feed-block"><textarea aria-label="Viết gì đó về bài viết này..." placeholder="Viết gì đó về bài viết này..." maxLength={500} value={caption} onChange={(event) => setCaption(event.target.value)} /><small>{caption.length}/500</small><button className="ridge-share-option" type="button" disabled={busy} onClick={() => void shareToFeed()}>{busy ? "Đang chia sẻ..." : "Chia sẻ lên bảng tin"}</button></div>
      <h3>Gửi trong tin nhắn</h3>
      <input aria-label="Tìm bạn bè" placeholder="Tìm bạn bè" type="search" value={search} onChange={(event) => setSearch(event.target.value)} />
      <div className="ridge-share-friends">{friends.filter((friend) => friend.username?.toLowerCase().includes(search.toLowerCase())).map((friend) => <label key={friend._id}>
        <input type="checkbox" checked={selected.includes(friend._id)} disabled={!selected.includes(friend._id) && selected.length >= 10} onChange={() => setSelected((ids) => ids.includes(friend._id) ? ids.filter((id) => id !== friend._id) : [...ids, friend._id])} />
        <span className="ridge-share-avatar">{friend.profilePicture ? <img src={friend.profilePicture} alt="" /> : friend.username?.[0]?.toUpperCase()}</span>{friend.username}
      </label>)}</div>
      <textarea aria-label="Viết gì đó..." placeholder="Viết gì đó..." maxLength={500} value={message} onChange={(event) => setMessage(event.target.value)} />
      <button className="ridge-share-send" type="button" disabled={busy || !selected.length} onClick={() => void send()}>{busy ? "Đang gửi..." : "Gửi"}</button>
      <button className="ridge-share-option" type="button" onClick={() => void copyLink()}>Sao chép liên kết</button>
      {feedback && <p role="alert" className="ridge-share-feedback">{feedback.startsWith("http") ? <><span>Không thể sao chép tự động, hãy sao chép liên kết này: </span><input readOnly value={feedback} /></> : feedback}</p>}
      <Toast message={toast} onDismiss={() => setToast("")} />
    </section>
  </div>;
}
