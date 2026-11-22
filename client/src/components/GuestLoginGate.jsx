import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { API_BASE } from "../lib/api.js";

export const GUEST_GATE_DELAY_MS = 8000;

export default function GuestLoginGate() {
  const [open, setOpen] = useState(() => {
    try { return sessionStorage.getItem("ridge:guest-gate-open") === "true"; }
    catch { return false; }
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const dialogRef = useRef(null);

  useEffect(() => {
    if (open) return;
    const timer = setTimeout(() => setOpen(true), GUEST_GATE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    try { sessionStorage.setItem("ridge:guest-gate-open", "true"); } catch { /* Storage may be disabled. */ }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const content = document.querySelector(".guest-profile-content");
    content?.setAttribute("aria-hidden", "true");
    if (content) content.inert = true;
    dialogRef.current?.querySelector("input")?.focus();
    function trapFocus(event) {
      if (event.key !== "Tab") return;
      const items = [...dialogRef.current.querySelectorAll("input, button, a[href]")].filter((item) => !item.disabled);
      if (!dialogRef.current.contains(document.activeElement)) { event.preventDefault(); (event.shiftKey ? items.at(-1) : items[0]).focus(); }
      else if (event.shiftKey && document.activeElement === items[0]) { event.preventDefault(); items.at(-1).focus(); }
      else if (!event.shiftKey && document.activeElement === items.at(-1)) { event.preventDefault(); items[0].focus(); }
    }
    document.addEventListener("keydown", trapFocus);
    return () => {
      document.removeEventListener("keydown", trapFocus);
      document.body.style.overflow = previousOverflow;
      content?.removeAttribute("aria-hidden");
      if (content) content.inert = false;
    };
  }, [open]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const form = new FormData(event.currentTarget);
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.get("email"), password: form.get("password") }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "Yêu cầu không thành công!");
      localStorage.setItem("token", data.token);
      window.location.reload();
    } catch (requestError) {
      setError(requestError instanceof TypeError ? "Không thể kết nối đến máy chủ." : requestError.message || "Yêu cầu không thành công!");
    } finally { setSubmitting(false); }
  }

  if (!open) return null;
  return <div className="guest-gate-backdrop">
    <section className="guest-login-gate ridge-auth-page" role="dialog" aria-modal="true" aria-labelledby="guest-gate-title" ref={dialogRef}>
      <div className="ridge-auth-card">
        <h2 className="ridge-auth-title" id="guest-gate-title">Đăng nhập để xem tiếp</h2>
        <p className="guest-gate-copy">Bạn cần đăng nhập để tiếp tục xem trang cá nhân này.</p>
        <form className="ridge-auth-form" onSubmit={handleSubmit}>
          <div className="ridge-auth-field"><label htmlFor="guest-gate-email">Email</label><input id="guest-gate-email" type="email" name="email" autoComplete="email" required /></div>
          <div className="ridge-auth-field"><label htmlFor="guest-gate-password">Mật khẩu</label><input id="guest-gate-password" type="password" name="password" autoComplete="current-password" required /></div>
          <button className="ridge-auth-submit" type="submit" disabled={submitting}>{submitting ? "Đang xử lý..." : "Đăng nhập"}</button>
          <Link className="ridge-auth-link ridge-auth-forgot" to="/forgot-password">Quên mật khẩu?</Link>
          {error && <p className="ridge-auth-feedback error" role="alert">{error}</p>}
          <div className="ridge-auth-divider"><span /><p>hoặc</p><span /></div>
          <p className="ridge-auth-note"><Link className="ridge-auth-link" to="/?tab=register">Tạo tài khoản mới</Link></p>
        </form>
      </div>
    </section>
  </div>;
}
