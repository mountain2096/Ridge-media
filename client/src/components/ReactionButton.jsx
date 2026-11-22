import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { REACTIONS, reactionInfo } from "../lib/reactions.js";
import "../reactions.css";

// One button + a picker with the 6 reactions.
// - click the button: toggle "Thích" (or remove your current reaction)
// - hover, keyboard focus or long-press (touch): open the picker
// props: mine (type | null), onReact(type | null), compact, className
function ReactionButton({ mine, onReact, compact = false, iconOnly = false, disabled = false, idleLabel = "Thích", idleIcon = null, count = 0, animate = false }) {
  const [open, setOpen] = useState(false);
  const [motionKey, setMotionKey] = useState(0);
  const [displayCount, setDisplayCount] = useState(count);
  const wrapRef = useRef(null);
  const emojiRef = useRef(null);
  const motionContext = useRef(null);
  const previousCount = useRef(count);
  const openTimer = useRef(0);
  const closeTimer = useRef(0);
  const longPressTimer = useRef(0);
  const longPressed = useRef(false);
  const info = reactionInfo(mine);

  useEffect(() => {
    if (!animate) return undefined;
    motionContext.current = gsap.context(() => {}, wrapRef);
    return () => motionContext.current?.revert();
  }, [animate]);

  useEffect(() => {
    if (!animate || !motionKey || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    motionContext.current?.add(() => {
      gsap.timeline().to(emojiRef.current, { scale: 1.35, duration: 0.25, ease: "elastic.out(1, 0.5)" })
        .to(emojiRef.current, { scale: 1, duration: 0.15, ease: "power2.out" });
      const dots = [...(wrapRef.current?.querySelectorAll(".ridge-reaction-dot") || [])];
      gsap.fromTo(dots, { x: 0, y: 0, scale: 0, opacity: 1 }, {
        x: (_, i) => Math.cos((i / dots.length) * Math.PI * 2) * 22,
        y: (_, i) => Math.sin((i / dots.length) * Math.PI * 2) * 22,
        scale: 1, opacity: 0, duration: 0.5, ease: "power2.out", onComplete: () => setMotionKey(0),
      });
    });
  }, [animate, motionKey]);

  useEffect(() => {
    const previous = previousCount.current;
    previousCount.current = count;
    if (!animate || previous === count || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDisplayCount(count);
      return;
    }
    const progress = { value: previous };
    motionContext.current?.add(() => gsap.to(progress, {
      value: count, duration: 0.35, ease: "power1.out", onUpdate: () => setDisplayCount(Math.round(progress.value)),
    }));
  }, [animate, count]);

  function triggerMotion() {
    if (animate && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) setMotionKey((key) => key + 1);
  }

  useEffect(() => () => {
    window.clearTimeout(openTimer.current);
    window.clearTimeout(closeTimer.current);
    window.clearTimeout(longPressTimer.current);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event) => { if (!wrapRef.current?.contains(event.target)) setOpen(false); };
    const onKeyDown = (event) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function openSoon() {
    window.clearTimeout(closeTimer.current);
    openTimer.current = window.setTimeout(() => setOpen(true), 350);
  }
  function closeSoon() {
    window.clearTimeout(openTimer.current);
    closeTimer.current = window.setTimeout(() => setOpen(false), 250);
  }
  function choose(type) {
    setOpen(false);
    triggerMotion();
    // Choosing the reaction you already have removes it.
    onReact?.(type === mine ? null : type);
  }
  function handleMainClick() {
    if (longPressed.current) { longPressed.current = false; return; }
    setOpen(false);
    triggerMotion();
    onReact?.(mine ? null : "like");
  }
  function handleKeyDown(event) {
    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      window.setTimeout(() => wrapRef.current?.querySelector('[role="menuitemradio"]')?.focus(), 0);
    }
  }
  function handlePickerKeyDown(event) {
    const items = [...wrapRef.current.querySelectorAll('[role="menuitemradio"]')];
    const index = items.indexOf(document.activeElement);
    if (event.key === "ArrowRight") { event.preventDefault(); items[(index + 1) % items.length].focus(); }
    if (event.key === "ArrowLeft") { event.preventDefault(); items[(index - 1 + items.length) % items.length].focus(); }
    if (event.key === "Escape") { setOpen(false); wrapRef.current.querySelector(".ridge-react-main")?.focus(); }
  }

  return (
    <span
      className={`ridge-react ${compact ? "ridge-react-compact" : ""}`}
      ref={wrapRef}
      onMouseEnter={openSoon}
      onMouseLeave={closeSoon}
    >
      <button
        className={`${compact ? "" : "post-action-button "}ridge-react-main ${info ? "has-reaction" : ""}`}
        type="button"
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-pressed={Boolean(info)}
        aria-label={info ? `Bạn đã thả ${info.label}. Bấm để bỏ.` : `${idleLabel}. Giữ hoặc nhấn mũi tên lên để chọn cảm xúc.`}
        title={iconOnly ? (info ? info.label : idleLabel) : undefined}
        onClick={handleMainClick}
        onKeyDown={handleKeyDown}
        onTouchStart={() => { longPressed.current = false; longPressTimer.current = window.setTimeout(() => { longPressed.current = true; setOpen(true); }, 450); }}
        onTouchEnd={() => window.clearTimeout(longPressTimer.current)}
        onTouchMove={() => window.clearTimeout(longPressTimer.current)}
        onContextMenu={(event) => { if (longPressed.current) event.preventDefault(); }}
      >
        <span ref={emojiRef} className="ridge-react-emoji" aria-hidden="true">{info?.type === "like" ? idleIcon : info ? info.emoji : idleIcon}</span>
        {motionKey > 0 && <span className="ridge-reaction-burst" aria-hidden="true">{Array.from({ length: 7 }, (_, index) => <i className="ridge-reaction-dot" key={index} />)}</span>}
        {!iconOnly && <span>{info ? info.label : idleLabel}{displayCount > 0 ? ` ${displayCount}` : ""}</span>}
      </button>
      {open && (
        <div className="ridge-react-picker" role="menu" aria-label="Chọn cảm xúc" onKeyDown={handlePickerKeyDown}>
          {REACTIONS.map((item) => (
            <button
              key={item.type} type="button" role="menuitemradio" aria-checked={mine === item.type}
              aria-label={item.label} title={item.label} onClick={() => choose(item.type)}
            >{item.emoji}</button>
          ))}
        </div>
      )}
    </span>
  );
}

export default ReactionButton;
