import { useEffect, useMemo, useRef } from "react";
import { useModalBehavior } from "./ConfirmDialog.jsx";
import "../stories.css";

function StoryComposer({ open, file, setFile, submitting, error, onClose, onSubmit }) {
  const dialogRef = useRef(null);
  const cancelRef = useRef(null);
  const previewUrl = useMemo(() => file ? URL.createObjectURL(file) : "", [file]);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  useModalBehavior(open, submitting, onClose, cancelRef, dialogRef);
  if (!open) return null;

  return (
    <div className="ridge-dialog-backdrop story-composer-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !submitting) onClose(); }}>
      <section className="ridge-dialog story-composer" role="dialog" aria-modal="true" aria-labelledby="story-composer-title" ref={dialogRef} tabIndex={-1}>
        <h2 id="story-composer-title">Đăng story</h2>
        <p>Story sẽ tự hết hạn sau 24 giờ. Chọn ảnh hoặc video tối đa 30 MB từ thiết bị.</p>
        <form onSubmit={onSubmit}>
          <label className="story-file-label">Ảnh hoặc video
            <input type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm" onChange={(event) => setFile(event.target.files?.[0] || null)} required />
          </label>
          {previewUrl && (file?.type.startsWith("video/")
            ? <video className="story-composer-preview" src={previewUrl} controls />
            : <img className="story-composer-preview" src={previewUrl} alt="Xem trước story" />)}
          {file && <p className="story-file-name">{file.name}</p>}
          {error && <p className="feedback-message error" role="alert">{error}</p>}
          <div className="ridge-dialog-actions">
            <button ref={cancelRef} className="ridge-dialog-button is-secondary" type="button" disabled={submitting} onClick={onClose}>Hủy</button>
            <button className="ridge-dialog-button is-primary" type="submit" disabled={submitting || !file}>{submitting ? "Đang đăng..." : "Đăng story"}</button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default StoryComposer;
