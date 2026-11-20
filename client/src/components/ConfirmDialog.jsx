import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import "../dialogs.css";

const ConfirmContext = createContext(null);

// eslint-disable-next-line react-refresh/only-export-components
export function useConfirm() {
  const confirmAction = useContext(ConfirmContext);
  if (!confirmAction) {
    throw new Error("useConfirm must be used inside ConfirmProvider");
  }
  return confirmAction;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useModalBehavior(isOpen, isBusy, onClose, initialFocusRef, dialogRef) {
  const busyRef = useRef(isBusy);
  const closeRef = useRef(onClose);

  useEffect(() => {
    busyRef.current = isBusy;
    closeRef.current = onClose;
  }, [isBusy, onClose]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusTarget = initialFocusRef?.current
      || dialogRef.current?.querySelector("button:not(:disabled), input:not(:disabled), textarea:not(:disabled)");
    focusTarget?.focus();

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        if (!busyRef.current) {
          event.preventDefault();
          closeRef.current();
        }
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;

      const focusable = [...dialogRef.current.querySelectorAll(
        'button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])'
      )].filter((element) => element.getClientRects().length > 0);
      if (!focusable.length) {
        event.preventDefault();
        dialogRef.current.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || !dialogRef.current.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !dialogRef.current.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      window.setTimeout(() => {
        if (previousFocus?.isConnected) previousFocus.focus();
      }, 0);
    };
  }, [isOpen, initialFocusRef, dialogRef]);
}

function ConfirmDialog({ options, onResolve }) {
  const dialogRef = useRef(null);
  const cancelRef = useRef(null);
  const finish = useCallback((confirmed) => onResolve(confirmed), [onResolve]);
  useModalBehavior(true, false, () => finish(false), cancelRef, dialogRef);

  return (
    <div className="ridge-dialog-backdrop" onClick={(event) => { if (event.target === event.currentTarget) finish(false); }}>
      <section className="ridge-dialog ridge-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="confirm-dialog-title" aria-describedby="confirm-dialog-message" ref={dialogRef} tabIndex={-1}>
        <div className="ridge-dialog-heading">
          <span className={`ridge-dialog-symbol ${options.danger ? "is-danger" : ""}`} aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="M12 8v4m0 4h.01"/><circle cx="12" cy="12" r="9"/></svg>
          </span>
          <h2 id="confirm-dialog-title">{options.title}</h2>
        </div>
        <p className="ridge-dialog-message" id="confirm-dialog-message">{options.message}</p>
        <div className="ridge-dialog-actions">
          <button className="ridge-dialog-button is-secondary" type="button" ref={cancelRef} onClick={() => finish(false)}>Hủy</button>
          <button className={`ridge-dialog-button ${options.danger ? "is-danger" : "is-primary"}`} type="button" onClick={() => finish(true)}>{options.confirmLabel || "Xác nhận"}</button>
        </div>
      </section>
    </div>
  );
}

export function ConfirmProvider({ children }) {
  const [pending, setPending] = useState(null);
  const pendingRef = useRef(null);

  const confirmAction = useCallback((options) => new Promise((resolve) => {
    pendingRef.current?.resolve(false);
    const nextPending = { options, resolve };
    pendingRef.current = nextPending;
    setPending(nextPending);
  }), []);

  const handleResolve = useCallback((result) => {
    pendingRef.current?.resolve(result);
    pendingRef.current = null;
    setPending(null);
  }, []);

  return (
    <ConfirmContext.Provider value={confirmAction}>
      {children}
      {pending && <ConfirmDialog options={pending.options} onResolve={handleResolve} />}
    </ConfirmContext.Provider>
  );
}
