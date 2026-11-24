import { useCallback, useEffect, useRef, useState } from 'react'
import { API_BASE } from "./lib/api.js";
import { Navigate, Outlet, Route, Routes, useLocation, useNavigate, useOutletContext, Link } from "react-router-dom";
import AppLayout from "./AppLayout.jsx";
import GuestLayout from "./components/GuestLayout.jsx";
import FeedPage from "./pages/FeedPage.jsx";
import ReelsView from "./components/ReelsView.jsx";
import ProfilePage from "./pages/ProfilePage.jsx";
import GuestProfilePage from "./pages/GuestProfilePage.jsx";
import MessagesView from "./components/MessagesView.jsx";
import ProfileSettings from "./components/ProfileSettings.jsx";
import AdminPanel from "./components/AdminPanel.jsx";
import ResetPasswordPage from './pages/ResetPasswordPage.jsx';
import ForgotPasswordPage from './pages/ForgotPasswordPage.jsx';
import './App.css'
import './auth.css'
import { getTokenStorageAction } from "./lib/tokenStorageChange.js";
import { initializeGoogleIdentity, clearGoogleCredentialHandler } from "./lib/googleAuth.js";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

function GoogleSignInButton({ activeTab, disabled, onCredential, formRef }) {
  const containerRef = useRef(null);
  const [width, setWidth] = useState(0);
  const [dark, setDark] = useState(() => document.documentElement.dataset.theme === "dark" ||
    (!document.documentElement.dataset.theme && window.matchMedia("(prefers-color-scheme: dark)").matches));

  useEffect(() => {
    if (!formRef.current) return undefined;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.min(400, Math.round(entry.contentRect.width))));
    observer.observe(formRef.current);
    return () => observer.disconnect();
  }, [formRef]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const updateTheme = () => setDark(document.documentElement.dataset.theme
      ? document.documentElement.dataset.theme === "dark" : media.matches);
    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    media.addEventListener("change", updateTheme);
    return () => { observer.disconnect(); media.removeEventListener("change", updateTheme); };
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!GOOGLE_CLIENT_ID || !width || !container) return undefined;
    let cancelled = false;
    initializeGoogleIdentity(GOOGLE_CLIENT_ID, onCredential).then((identity) => {
      if (cancelled) return;
      identity.renderButton(container, {
        type: "standard", theme: dark ? "filled_black" : "outline", size: "large",
        shape: "rectangular", logo_alignment: "center",
        text: activeTab === "register" ? "signup_with" : "signin_with", width, locale: "vi",
      });
    }).catch((error) => {
      if (!cancelled) onCredential({ error: error.message });
    });
    return () => { cancelled = true; container.replaceChildren(); clearGoogleCredentialHandler(onCredential); };
  }, [activeTab, dark, onCredential, width]);

  return <div className="ridge-auth-google-wrap">
    {GOOGLE_CLIENT_ID ? <div ref={containerRef} className={`ridge-auth-google${disabled ? " is-disabled" : ""}`} aria-disabled={disabled} /> :
      <button className="ridge-auth-google-fallback" type="button" disabled title="Chưa cấu hình Google" aria-label="Tiếp tục với Google, chưa cấu hình">
        <svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#4285F4" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2v5.1h6.6c3.9-3.6 6.1-8.9 6.1-15Z"/><path fill="#34A853" d="M24 44c5.5 0 10.1-1.8 13.5-4.8l-6.6-5.1c-1.8 1.2-4 1.9-6.9 1.9-5.3 0-9.8-3.6-11.4-8.4H5.8v5.3A20 20 0 0 0 24 44Z"/><path fill="#FBBC05" d="M12.6 27.6a12 12 0 0 1 0-7.2v-5.3H5.8a20 20 0 0 0 0 17.8l6.8-5.3Z"/><path fill="#EA4335" d="M24 12c3 0 5.7 1 7.8 3l5.8-5.8A19.4 19.4 0 0 0 24 4 20 20 0 0 0 5.8 15.1l6.8 5.3C14.2 15.6 18.7 12 24 12Z"/></svg>
        <span>Tiếp tục với Google</span>
      </button>}
    {disabled && GOOGLE_CLIENT_ID && <span className="ridge-auth-google-blocker" aria-hidden="true" />}
  </div>;
}

function AuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const tab = new URLSearchParams(location.search).get("tab");
  const [activeTab, setActiveTab] = useState(tab === "login" || tab === "register" ? tab : "register");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState({type: "", text:""})
  const googleFormRef = useRef(null);
  const googleCredential = useCallback(async ({ credential, error }) => {
    if (error) {
      setFeedback({ type: "error", text: error });
      return;
    }
    setFeedback({ type: "", text: "" });
    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_BASE}/api/auth/google`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ credential }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Đăng nhập Google thất bại.");
      localStorage.setItem("token", data.token);
      navigate("/feed");
    } catch (error) {
      setFeedback({ type: "error", text: error.message || "Không thể kết nối đến máy chủ." });
    } finally {
      setIsSubmitting(false);
    }
  }, [navigate]);

  async function handleSubmit(event) {
    event.preventDefault();
    setFeedback({type:"", text:""});

    if(activeTab === "register" && password !== confirmPassword) {
      setFeedback({
        type:"error",
        text:"Mật khẩu xác nhận và mật khẩu không trùng khớp!"
      });
      return
    }

    setIsSubmitting(true)
    try{
    const formData = new FormData(event.currentTarget);
    const email = formData.get("email");
    const passwordValue = formData.get("password");
    const username = formData.get("username");

    const endpoint = 
    activeTab === "register" ? "/api/auth/register" : "/api/auth/login";

    const requestBody = 
    activeTab === "register"
    ? {username, email, password: passwordValue, confirmPassword}
    : {email, password: passwordValue};

    try{
      const response = await fetch(
        `${API_BASE}${endpoint}`,
        {
          method: "POST",
          headers:{
            "Content-Type": "application/json"
          },
          body: JSON.stringify(requestBody),
        }
      );
      
      const data = await response.json();

      if(!response.ok) {
        throw new Error(data.message || "Yêu cầu khong thành công!");
    }

    if(activeTab === "login") {
      localStorage.setItem("token", data.token);
      navigate("/feed");
    }

    setFeedback({
      type: "success",
      text: data.message
    });
    if(activeTab === 'register'){
      setPassword("");
      setConfirmPassword("");
      setActiveTab("login")
    }
    }catch(error) {
      setFeedback({
        type: "error",
        text: error.message || "Đã xảy ra lỗi!",
      });
    }
  } catch(err){
    setFeedback({
      type:"error",
      text:err.message || "Không thể kết nối đến máy chủ."
    }) 
  } finally{
    setIsSubmitting(false)
  }
}
  return (
    <main className="auth-page ridge-auth-page">
      <section className="ridge-auth-card" aria-labelledby="auth-title">
        <div className="ridge-auth-brand" aria-label="Ridge">
          <span className="ridge-auth-mark" aria-hidden="true">R</span>
          <span>Ridge</span>
        </div>
        <div className="ridge-auth-tabs" role="tablist" aria-label="Tài khoản">
          <button className={`ridge-auth-tab ${activeTab === "register" ? "is-selected" : ""}`} type="button" role="tab" aria-selected={activeTab === "register"} onClick={() => setActiveTab("register")}>Đăng ký</button>
          <button className={`ridge-auth-tab ${activeTab === "login" ? "is-selected" : ""}`} type="button" role="tab" aria-selected={activeTab === "login"} onClick={() => setActiveTab("login")}>Đăng nhập</button>
        </div>
        <h1 className="ridge-auth-title" id="auth-title">{activeTab === "register" ? "Đăng ký" : "Đăng nhập"}</h1>
        <form ref={googleFormRef} className="ridge-auth-form" onSubmit={handleSubmit}>
          <GoogleSignInButton activeTab={activeTab} disabled={isSubmitting} onCredential={googleCredential} formRef={googleFormRef} />
          <div className="ridge-auth-divider"><span /><p>Hoặc dùng email và mật khẩu</p><span /></div>
          {activeTab === "register" && <div className="ridge-auth-field"><label htmlFor="auth-username">Họ và tên</label><input id="auth-username" type="text" name="username" autoComplete="name" required /></div>}
          <div className="ridge-auth-field"><label htmlFor="auth-email">Email</label><input id="auth-email" type="email" name="email" autoComplete="email" required /></div>
          {activeTab === "register" && <p className="ridge-auth-hint">Mật khẩu cần ít nhất 8 ký tự, gồm chữ hoa, chữ thường và số.</p>}
          <div className="ridge-auth-field"><label htmlFor="auth-password">Mật khẩu</label><div className="ridge-auth-password"><input id="auth-password" type={showPassword ? "text" : "password"} name="password" autoComplete={activeTab === "register" ? "new-password" : "current-password"} value={password} onChange={(event) => setPassword(event.target.value)} required minLength={activeTab === "register" ? 8 : undefined} title={activeTab === "register" ? "Ít nhất 8 ký tự, có chữ hoa, chữ thường và số." : undefined} /><button className="ridge-auth-toggle" type="button" aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"} onClick={() => setShowPassword((visible) => !visible)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.3-6 9.5-6 9.5 6 9.5 6-3.3 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.5"/></svg></button></div></div>
          {activeTab === "register" && <div className="ridge-auth-field"><label htmlFor="auth-confirm-password">Xác nhận mật khẩu</label><div className="ridge-auth-password"><input id="auth-confirm-password" type={showConfirmPassword ? "text" : "password"} name="confirmPassword" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required minLength={8} /><button className="ridge-auth-toggle" type="button" aria-label={showConfirmPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"} onClick={() => setShowConfirmPassword((visible) => !visible)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.3-6 9.5-6 9.5 6 9.5 6-3.3 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.5"/></svg></button></div></div>}
          <button className="ridge-auth-submit" type="submit" disabled={isSubmitting}>{isSubmitting ? "Đang xử lý..." : activeTab === "register" ? "Đăng ký" : "Đăng nhập"}</button>
          {activeTab !== "register" && <Link className="ridge-auth-link ridge-auth-forgot" to="/forgot-password">Quên mật khẩu?</Link>}
          {feedback.text && <p className={`ridge-auth-feedback ${feedback.type}`} role={feedback.type === "error" ? "alert" : "status"} aria-live={feedback.type === "error" ? "assertive" : "polite"}>{feedback.text}</p>}
          <p className="ridge-auth-note">{activeTab === "register" ? "Bạn đã có tài khoản? " : "Chưa có tài khoản? "}<button className="ridge-auth-link" type="button" onClick={() => setActiveTab(activeTab === "register" ? "login" : "register")}>{activeTab === "register" ? "Đăng nhập ngay" : "Đăng ký ngay"}</button></p>
        </form>
      </section>
    </main>
  )
}


function RequireAuth() {
  const token = localStorage.getItem("token");
  const context = useOutletContext();

  return token ? <Outlet context={context} /> : <Navigate to="/" replace />;
}

function AuthRoute(){
  const token = localStorage.getItem('token');

  return token ? <Navigate to="/feed" replace/>:<AuthPage/>
}
function App() {
  const navigate = useNavigate();
  const [sessionChanged, setSessionChanged] = useState(false);

  useEffect(() => {
    function handleStorage(event) {
      const hasDraft = [...document.querySelectorAll(".create-post-input, .comment-form input, .reel-comments-panel input, #message-content")]
        .some((input) => input.value.trim());
      const action = getTokenStorageAction(event, hasDraft);
      if (action === "logout") {
        setSessionChanged(false);
        navigate("/", { replace: true });
      } else if (action === "notice") setSessionChanged(true);
      else if (action === "reload") window.location.reload();
    }

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [navigate]);

  return (
    <>
    {sessionChanged && <aside className="token-change-notice" role="status">
      <span>Tài khoản đã thay đổi ở tab khác. Bấm để tải lại.</span>
      <button type="button" onClick={() => window.location.reload()}>Tải lại</button>
    </aside>}
    <Routes>
      <Route path="/" element={<AuthRoute />} />
      <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route element={<AppOrGuestLayout />}>
        <Route path="feed" element={<TokenRoute guest={<Navigate to="/" replace />} authenticated={<FeedPage section="feed" />} />} />
        <Route path="profile/:id" element={<TokenRoute guest={<GuestProfilePage />} authenticated={<ProfilePage embedded />} />} />
        <Route element={<RequireAuth />}>
          <Route path="messages" element={<MessagesViewRoute />} />
          <Route path="friends" element={<FeedPage section="connections" />} />
          <Route path="saved" element={<FeedPage section="saved" />} />
          <Route path="settings" element={<ProfileSettingsRoute />} />
          <Route path="admin" element={<AdminPanelRoute />} />
          <Route path="reels" element={<ReelsView />} />
          <Route path="activity" element={<FeedPage section="activity" />} />
          <Route path="post/:id" element={<FeedPage section="post" />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </>
  );
}

function AppOrGuestLayout() {
  return localStorage.getItem("token") ? <AppLayout /> : <GuestLayout />;
}

function TokenRoute({ guest, authenticated }) {
  return localStorage.getItem("token") ? authenticated : guest;
}

function MessagesViewRoute() {
  const { currentUser } = useOutletContext();
  const location = useLocation();
  return <section className="feed-column feed-column-single">
    <MessagesView currentUser={currentUser} initialConversationId={location.state?.openConversationId} />
  </section>;
}

function ProfileSettingsRoute() {
  const { currentUser, setCurrentUser } = useOutletContext();
  return <section className="feed-column feed-column-single">
    {!currentUser?._id ? <p>Đang tải hồ sơ...</p> : <ProfileSettings
      key={currentUser._id}
      currentUser={currentUser}
      onProfileSaved={(savedUser) => setCurrentUser((current) => ({
        ...current, ...savedUser, _id: savedUser.id || current?._id,
      }))}
    />}
  </section>;
}

function AdminPanelRoute() {
  return <section className="feed-column feed-column-single"><AdminPanel /></section>;
}

export default App;
