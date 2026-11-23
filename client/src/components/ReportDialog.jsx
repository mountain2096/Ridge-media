import { useEffect, useRef, useState } from "react";
import { useModalBehavior } from "./ConfirmDialog.jsx";

const reasons = [
  ["spam", "Spam"],
  ["violence", "Bạo lực"],
  ["abuse", "Quấy rối hoặc lạm dụng"],
  ["misinfo", "Thông tin sai lệch"],
  ["other", "Khác"],
];

function ReportDialog({ open, targetType, onClose, onSubmit }) {
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const dialogRef = useRef(null);
  const firstReasonRef = useRef(null);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useModalBehavior(open, isSubmitting, () => {
    if (!isSubmitting) closeRef.current();
  }, firstReasonRef, dialogRef);

  if (!open) return null;

  async function handleSubmit(event) {
    event.preventDefault();
    if (!reason || isSubmitting) return;
    setIsSubmitting(true);
    setError("");
    try {
      await onSubmit({ reason, description });
      onClose();
    } catch (submitError) {
      setError(submitError.message || "Không thể gửi báo cáo.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const title = targetType === "comment" ? "Báo cáo bình luận" : "Báo cáo bài viết";

  return (
    <div className="ridge-dialog-backdrop" onClick={(event) => { if (event.target === event.currentTarget && !isSubmitting) onClose(); }}>
      <section className="ridge-dialog ridge-report-dialog" role="dialog" aria-modal="true" aria-labelledby="report-dialog-title" ref={dialogRef} tabIndex={-1}>
        <header className="ridge-dialog-heading">
          <span className="ridge-dialog-symbol is-danger" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 8v4m0 4h.01"/><path d="M10.3 3.9 2.7 17a2 2 0 0 0 1.7 3h15.2a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/></svg></span>
          <h2 id="report-dialog-title">{title}</h2>
        </header>
        <form className="ridge-report-form" onSubmit={handleSubmit}>
          <fieldset className="ridge-report-reasons" disabled={isSubmitting}>
            <legend>Lý do</legend>
            {reasons.map(([value, label], index) => (
              <label className={`ridge-report-reason ${reason === value ? "is-selected" : ""}`} key={value}>
                <input ref={index === 0 ? firstReasonRef : undefined} type="radio" name="report-reason" value={value} checked={reason === value} onChange={() => setReason(value)} />
                <span className="ridge-report-radio" aria-hidden="true" />
                <span>{label}</span>
              </label>
            ))}
          </fieldset>
          <div className="ridge-report-description-field">
            <label htmlFor="report-description">Mô tả lý do</label>
            <textarea id="report-description" value={description} onChange={(event) => setDescription(event.target.value)} maxLength={500} rows={4} disabled={isSubmitting} />
            <span className="ridge-report-counter">{description.length}/500</span>
          </div>
          {error && <p className="ridge-dialog-error" role="alert">{error}</p>}
          <div className="ridge-dialog-actions">
            <button className="ridge-dialog-button is-secondary" type="button" onClick={onClose} disabled={isSubmitting}>Hủy</button>
            <button className="ridge-dialog-button is-danger" type="submit" disabled={isSubmitting || !reason}>{isSubmitting ? "Đang gửi..." : "Gửi báo cáo"}</button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default ReportDialog;
