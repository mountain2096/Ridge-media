import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useModalBehavior } from "./ConfirmDialog.jsx";
import { REACTIONS, fetchPostReactions } from "../lib/reactions.js";
import "../dialogs.css";
import "../reactions.css";

export default function ReactionListDialog({ postId, onClose }) {
  const dialogRef = useRef(null);
  const [type, setType] = useState("");
  const [data, setData] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useModalBehavior(true, false, onClose, null, dialogRef);

  useEffect(() => {
    let active = true;
    fetchPostReactions(postId, { type: type || undefined })
      .then((result) => { if (active) { setData(result); setItems(result.items); } })
      .catch((reason) => { if (active) setError(reason.message || "Không thể tải danh sách cảm xúc."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [postId, type]);

  async function loadMore() {
    setLoading(true);
    setError("");
    try {
      const result = await fetchPostReactions(postId, { type: type || undefined, page: data.pagination.page + 1 });
      setItems((current) => [...current, ...result.items]);
      setData(result);
    } catch (reason) {
      setError(reason.message || "Không thể tải thêm.");
    } finally { setLoading(false); }
  }

  return <div className="ridge-dialog-backdrop" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="ridge-dialog ridge-reaction-dialog" role="dialog" aria-modal="true" aria-labelledby="reaction-dialog-title" ref={dialogRef} tabIndex={-1}>
      <div className="ridge-dialog-heading"><h2 id="reaction-dialog-title">Cảm xúc</h2><button className="ridge-reaction-close" type="button" aria-label="Đóng" onClick={onClose}>×</button></div>
      {data && <div className="ridge-reaction-tabs" role="tablist" aria-label="Lọc cảm xúc">
        <button type="button" role="tab" aria-selected={!type} onClick={() => { if (type) { setLoading(true); setError(""); setType(""); } }}>Tất cả <span>{Object.values(data.counts).reduce((sum, count) => sum + count, 0)}</span></button>
        {REACTIONS.filter((reaction) => data.counts[reaction.type] > 0).map((reaction) => <button key={reaction.type} type="button" role="tab" aria-selected={type === reaction.type} onClick={() => { if (type !== reaction.type) { setLoading(true); setError(""); setType(reaction.type); } }}>{reaction.emoji} <span>{data.counts[reaction.type]}</span></button>)}
      </div>}
      <div className="ridge-reaction-people" aria-live="polite">
        {items.map(({ user, reaction }) => <div className="ridge-reaction-person" key={user._id}>
          <Link className="ridge-reaction-avatar" to={`/profile/${user._id}`} onClick={onClose}>{user.profilePicture ? <img src={user.profilePicture} alt="" /> : (user.username || "?").charAt(0).toUpperCase()}</Link>
          <Link className="profile-name-link" to={`/profile/${user._id}`} onClick={onClose}>{user.username}</Link>
          <span aria-label={REACTIONS.find((item) => item.type === reaction)?.label}>{REACTIONS.find((item) => item.type === reaction)?.emoji}</span>
        </div>)}
        {loading && <p>Đang tải...</p>}
        {!loading && error && <p className="ridge-dialog-error" role="alert">{error}</p>}
        {!loading && !error && items.length === 0 && <p>Chưa có ai thả cảm xúc.</p>}
      </div>
      {data && data.pagination.page < data.pagination.pages && <button className="ridge-dialog-button is-secondary ridge-reaction-more" type="button" disabled={loading} onClick={loadMore}>Tải thêm</button>}
    </section>
  </div>;
}
