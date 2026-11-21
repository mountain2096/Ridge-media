import { useEffect, useRef } from "react";

const ICON_PATHS = {
  message: "M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z",
  notification: "M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4",
};

// Realtime pop-up for an incoming message or notification.
// `toast`: { kind: "message" | "notification", title, body, avatar }
function LiveToast({ toast, onOpen, onDismiss }) {
  const dismissRef = useRef(onDismiss);
  useEffect(() => {
    dismissRef.current = onDismiss;
  }, [onDismiss]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => dismissRef.current?.(), 6000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  if (!toast) return null;

  return (
    <div className="ridge-live-toast" role="status" aria-live="polite">
      <button className="ridge-live-toast-main" type="button" onClick={() => onOpen?.(toast)}>
        <span className="ridge-live-toast-avatar" aria-hidden="true">
          {toast.avatar ? <img src={toast.avatar} alt="" /> : (toast.title?.charAt(0).toUpperCase() || "?")}
          <svg className="ridge-live-toast-kind" viewBox="0 0 24 24"><path d={ICON_PATHS[toast.kind] || ICON_PATHS.notification} /></svg>
        </span>
        <span className="ridge-live-toast-text">
          <strong>{toast.title}</strong>
          <span>{toast.body}</span>
        </span>
      </button>
      <button className="ridge-live-toast-close" type="button" aria-label="Đóng thông báo" onClick={() => dismissRef.current?.()}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
      </button>
    </div>
  );
}

export default LiveToast;
