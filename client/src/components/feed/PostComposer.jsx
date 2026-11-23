import { resolveMediaUrl } from "../../lib/api.js";
import { useEffect, useRef, useState } from "react";

export default function PostComposer({ currentUser, postContent, onPostContentChange, postPrivacy, onPostPrivacyChange, postImageFile, postVideoFile, onImageFileChange, onVideoFileChange, isPosting, postError, onSubmit }) {
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const privacyRef = useRef(null);
  const options = [
    ["public", "Mọi người", <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></>],
    ["friends", "Bạn bè", <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>],
    ["private", "Chỉ mình tôi", <><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 1 1 8 0v3" /></>],
  ];
  const selectedPrivacy = options.find(([value]) => value === postPrivacy) || options[0];

  useEffect(() => {
    if (!privacyOpen) return undefined;
    const close = (event) => { if (!privacyRef.current?.contains(event.target)) setPrivacyOpen(false); };
    const escape = (event) => { if (event.key === "Escape") setPrivacyOpen(false); };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", close); document.removeEventListener("keydown", escape); };
  }, [privacyOpen]);

  function handlePrivacyKeyDown(event) {
    const items = [...privacyRef.current.querySelectorAll('[role="option"]')];
    const index = items.indexOf(document.activeElement);
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setPrivacyOpen(true);
      window.setTimeout(() => {
        const openItems = [...(privacyRef.current?.querySelectorAll('[role="option"]') || [])];
        openItems[(index < 0 ? (event.key === "ArrowDown" ? 0 : openItems.length - 1) : index + (event.key === "ArrowDown" ? 1 : -1) + openItems.length) % openItems.length]?.focus();
      }, 0);
    } else if (event.key === "Enter" && index >= 0) {
      event.preventDefault();
      onPostPrivacyChange(items[index].dataset.value);
      setPrivacyOpen(false);
    } else if (event.key === "Escape") setPrivacyOpen(false);
  }

  return (
    <form className="create-post-card card" onSubmit={onSubmit}>
      <h2>Tạo bài viết</h2>
      <div className="composer-row">
        <span className="composer-avatar">
          {currentUser?.profilePicture ? <img src={resolveMediaUrl(currentUser.profilePicture)} alt="" /> : (currentUser?.username?.charAt(0).toUpperCase() || "R")}
        </span>
        <textarea
          className="create-post-input"
          aria-label="Nội dung bài viết"
          placeholder="Bạn đang nghĩ gì?"
          rows="2"
          maxLength="500"
          value={postContent}
          onChange={(event) => onPostContentChange(event.target.value)}
        />
      </div>
      <div className="composer-actions">
        <label className="chip" title="Ảnh hoặc video tùy chọn, tối đa 30 MB mỗi tệp.">
          <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3" /><circle cx="9" cy="10" r="1.8" /><path d="m21 16-5-5-9 9" /></svg>
          Ảnh
          <input id="post-image-input" type="file" accept="image/jpeg,image/png,image/webp,image/gif" aria-label="Chọn ảnh cho bài viết" onChange={(event) => onImageFileChange(event.target.files?.[0] || null)} />
        </label>
        <label className="chip" title="Ảnh hoặc video tùy chọn, tối đa 30 MB mỗi tệp.">
          <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="6" width="13" height="12" rx="3" /><path d="m16 10 5-3v10l-5-3" /></svg>
          Video
          <input id="post-video-input" type="file" accept="video/mp4,video/webm" aria-label="Chọn video cho bài viết" onChange={(event) => onVideoFileChange(event.target.files?.[0] || null)} />
        </label>
        {(postImageFile || postVideoFile) && <span className="selected-media-name">{[postImageFile?.name, postVideoFile?.name].filter(Boolean).join(" · ")} · Tối đa 30 MB mỗi tệp</span>}
        <span className="composer-spacer" />
        <div className="select-label privacy-select" ref={privacyRef} onKeyDown={handlePrivacyKeyDown}>
          <span>Ai có thể xem?</span>
          <button className="privacy-select-trigger" type="button" aria-label={`Ai có thể xem: ${selectedPrivacy[1]}`} aria-haspopup="listbox" aria-expanded={privacyOpen} aria-controls="post-privacy-options" onClick={() => setPrivacyOpen((open) => !open)}>
            <svg viewBox="0 0 24 24" aria-hidden="true">{selectedPrivacy[2]}</svg>{selectedPrivacy[1]}<svg className="privacy-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m7 10 5 5 5-5" /></svg>
          </button>
          {privacyOpen && <div id="post-privacy-options" className="privacy-options" role="listbox" aria-label="Ai có thể xem?">
            {options.map(([value, label, icon]) => <button key={value} className="privacy-option" type="button" role="option" data-value={value} aria-selected={value === postPrivacy} tabIndex={0} onClick={() => { onPostPrivacyChange(value); setPrivacyOpen(false); }}>
              <svg viewBox="0 0 24 24" aria-hidden="true">{icon}</svg><span>{label}</span>{value === postPrivacy && <svg className="privacy-check" viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6" /></svg>}
            </button>)}
          </div>}
        </div>
        <button className="create-post-button btn-primary" type="submit" disabled={isPosting}>{isPosting ? "Đang đăng..." : "Đăng bài"}</button>
      </div>
      {postError && <p className="feedback-message error">{postError}</p>}
    </form>
  );
}
