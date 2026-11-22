import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { useConfirm, useModalBehavior } from "./ConfirmDialog.jsx";
import "../stories.css";

function relativeTime(value) {
  const elapsed = Math.max(0, Date.now() - new Date(value).getTime());
  const minutes = Math.floor(elapsed / 60000);
  if (minutes < 1) return "Vừa xong";
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  return `${Math.floor(hours / 24)} ngày trước`;
}

function StoryViewer({ groups, activeGroup, activeIndex, currentUserId, error, onChange, onClose, onDelete }) {
  const [paused, setPaused] = useState(false);
  const [videoDuration, setVideoDuration] = useState(5);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const dialogRef = useRef(null);
  const closeRef = useRef(null);
  const videoRef = useRef(null);
  const confirm = useConfirm();
  const story = activeGroup?.items?.[activeIndex];
  const shouldAutoAdvance = Boolean(story && !paused && story.mediaType !== "video");
  const isOwner = activeGroup?.author?._id === currentUserId;
  const duration = story?.mediaType === "video" ? videoDuration : 5;
  const advance = useCallback((direction) => {
    const index = groups.findIndex((group) => group.author?._id === activeGroup.author?._id);
    if (direction > 0) {
      if (activeIndex < activeGroup.items.length - 1) onChange(activeGroup, activeIndex + 1);
      else if (groups[index + 1]) onChange(groups[index + 1], 0);
      else onClose();
    } else if (activeIndex > 0) onChange(activeGroup, activeIndex - 1);
    else if (groups[index - 1]) onChange(groups[index - 1], groups[index - 1].items.length - 1);
  }, [activeGroup, activeIndex, groups, onChange, onClose]);
  const advanceRef = useRef(advance);
  useEffect(() => { advanceRef.current = advance; }, [advance]);

  useModalBehavior(Boolean(story) && !confirmingDelete, false, onClose, closeRef, dialogRef);

  useEffect(() => {
    if (!shouldAutoAdvance) return undefined;
    const timeout = window.setTimeout(() => advanceRef.current(1), duration * 1000);
    return () => window.clearTimeout(timeout);
  }, [story?._id, shouldAutoAdvance, duration]);

  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === "ArrowRight") { event.preventDefault(); advance(1); }
      if (event.key === "ArrowLeft") { event.preventDefault(); advance(-1); }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [advance]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const closeMenu = (event) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", closeMenu);
    return () => document.removeEventListener("keydown", closeMenu);
  }, [menuOpen]);

  useEffect(() => {
    if (story?.mediaType !== "video" || !videoRef.current) return;
    if (paused) videoRef.current.pause();
    else void videoRef.current.play().catch(() => {});
  }, [paused, story?._id, story?.mediaType]);

  if (!story) return null;

  async function handleDelete() {
    setConfirmingDelete(true);
    const accepted = await confirm({
      title: "Xóa story",
      message: "Bạn có chắc muốn xóa story này?",
      confirmLabel: "Xóa story",
      danger: true,
    });
    if (!accepted) { setConfirmingDelete(false); return; }
    setMenuOpen(false);
    const deleted = await onDelete(story._id);
    if (!deleted) setConfirmingDelete(false);
  }

  const authorName = activeGroup.author?.username || "Người dùng";
  const content = (
    <div className="story-viewer-backdrop" onPointerDown={() => setPaused(true)} onPointerUp={() => setPaused(false)} onPointerCancel={() => setPaused(false)}>
      <section className="story-viewer-dialog" role="dialog" aria-modal="true" aria-labelledby="story-viewer-title" ref={dialogRef} tabIndex={-1}>
        <div className="story-progress-list" aria-label="Tiến trình story">
          {activeGroup.items.map((item, index) => <span className="story-progress-track" key={item._id}>
            <span
              key={`${item._id}-${index === activeIndex ? duration : 0}`}
              className={`story-progress-fill ${index < activeIndex ? "is-complete" : ""} ${index === activeIndex ? "is-current" : ""}`}
              style={{ "--story-duration": `${duration}s`, animationPlayState: paused ? "paused" : "running" }}
            />
          </span>)}
        </div>
        <header className="story-viewer-header">
          <Link className="story-viewer-author" to={`/profile/${activeGroup.author?._id}`}>
            <span className="story-viewer-avatar">{activeGroup.author?.profilePicture ? <img src={activeGroup.author.profilePicture} alt="" /> : authorName.charAt(0).toUpperCase()}</span>
            <span><strong id="story-viewer-title">{authorName}</strong><time>{relativeTime(story.createdAt)}</time></span>
          </Link>
          <div className="story-viewer-controls">
            {isOwner && <div className="story-viewer-menu-wrap">
              <button className="story-viewer-icon-button" type="button" aria-label="Tùy chọn story" aria-haspopup="menu" aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>
                <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.7" /><circle cx="12" cy="12" r="1.7" /><circle cx="19" cy="12" r="1.7" /></svg>
              </button>
              {menuOpen && <div className="story-viewer-menu" role="menu"><button type="button" role="menuitem" onClick={handleDelete}>Xóa story</button></div>}
            </div>}
            <button className="story-viewer-icon-button" ref={closeRef} type="button" aria-label="Đóng story" onClick={onClose}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg></button>
          </div>
        </header>
        {error && <p className="story-viewer-error" role="alert">{error}</p>}
        <button className="story-tap-zone story-tap-previous" type="button" aria-hidden="true" tabIndex={-1} onClick={() => advance(-1)} />
        <button className="story-tap-zone story-tap-next" type="button" aria-hidden="true" tabIndex={-1} onClick={() => advance(1)} />
        {story.mediaType === "video" ? <video
          key={story._id}
          className="story-viewer-media"
          ref={videoRef}
          src={story.mediaUrl}
          autoPlay
          onLoadedMetadata={(event) => setVideoDuration(Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 5)}
          onPlay={() => setPaused(false)}
          onEnded={() => advance(1)}
        /> : <img key={story._id} className="story-viewer-media" src={story.mediaUrl} alt={`Story của ${authorName}`} />}
        <button className="story-arrow story-arrow-previous" type="button" aria-label="Story trước" onClick={() => advance(-1)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg></button>
        <button className="story-arrow story-arrow-next" type="button" aria-label="Story tiếp theo" onClick={() => advance(1)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg></button>
      </section>
    </div>
  );

  return createPortal(content, document.body);
}

export default StoryViewer;
