import { useState } from 'react'
import { API_BASE } from "./lib/api.js";
import { Navigate, Outlet, Route, Routes, useLocation, useNavigate, useOutletContext, Link } from "react-router-dom";
import AppLayout from "./AppLayout.jsx";
import GuestLayout from "./components/GuestLayout.jsx";
import FeedPage from "./pages/FeedPage.jsx";
import ProfilePage from "./pages/ProfilePage.jsx";
import GuestFeedPage from "./pages/GuestFeedPage.jsx";
import GuestProfilePage from "./pages/GuestProfilePage.jsx";
import MessagesView from "./components/MessagesView.jsx";
import ProfileSettings from "./components/ProfileSettings.jsx";
import AdminPanel from "./components/AdminPanel.jsx";
import ResetPasswordPage from './pages/ResetPasswordPage.jsx';
import ForgotPasswordPage from './pages/ForgotPasswordPage.jsx';
import './App.css'
import './auth.css'

function AuthPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("register");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState({type: "", text:""})

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
        <form className="ridge-auth-form" onSubmit={handleSubmit}>
          {activeTab === "register" && <div className="ridge-auth-field"><label htmlFor="auth-username">Họ và tên</label><input id="auth-username" type="text" name="username" autoComplete="name" required /></div>}
          <div className="ridge-auth-field"><label htmlFor="auth-email">Email</label><input id="auth-email" type="email" name="email" autoComplete="email" required /></div>
          {activeTab === "register" && <p className="ridge-auth-hint">Mật khẩu cần ít nhất 8 ký tự, gồm chữ hoa, chữ thường và số.</p>}
          <div className="ridge-auth-field"><label htmlFor="auth-password">Mật khẩu</label><div className="ridge-auth-password"><input id="auth-password" type={showPassword ? "text" : "password"} name="password" autoComplete={activeTab === "register" ? "new-password" : "current-password"} value={password} onChange={(event) => setPassword(event.target.value)} required minLength={activeTab === "register" ? 8 : undefined} title={activeTab === "register" ? "Ít nhất 8 ký tự, có chữ hoa, chữ thường và số." : undefined} /><button className="ridge-auth-toggle" type="button" aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"} onClick={() => setShowPassword((visible) => !visible)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.3-6 9.5-6 9.5 6 9.5 6-3.3 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.5"/></svg></button></div></div>
          {activeTab === "register" && <div className="ridge-auth-field"><label htmlFor="auth-confirm-password">Xác nhận mật khẩu</label><div className="ridge-auth-password"><input id="auth-confirm-password" type={showConfirmPassword ? "text" : "password"} name="confirmPassword" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required minLength={8} /><button className="ridge-auth-toggle" type="button" aria-label={showConfirmPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"} onClick={() => setShowConfirmPassword((visible) => !visible)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.3-6 9.5-6 9.5 6 9.5 6-3.3 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.5"/></svg></button></div></div>}
          <button className="ridge-auth-submit" type="submit" disabled={isSubmitting}>{isSubmitting ? "Đang xử lý..." : activeTab === "register" ? "Đăng ký" : "Đăng nhập"}</button>
          {activeTab !== "register" && <Link className="ridge-auth-link ridge-auth-forgot" to="/forgot-password">Quên mật khẩu?</Link>}
          {feedback.text && <p className={`ridge-auth-feedback ${feedback.type}`} role={feedback.type === "error" ? "alert" : "status"} aria-live={feedback.type === "error" ? "assertive" : "polite"}>{feedback.text}</p>}
          <p className="ridge-auth-note">{activeTab === "register" ? "Bạn đã có tài khoản? " : "Chưa có tài khoản? "}<button className="ridge-auth-link" type="button" onClick={() => setActiveTab(activeTab === "register" ? "login" : "register")}>{activeTab === "register" ? "Đăng nhập ngay" : "Đăng ký ngay"}</button></p>
          <p className="ridge-auth-note"><Link className="ridge-auth-link" to="/feed">Xem với tư cách khách</Link></p>
          <div className="ridge-auth-social"><div className="ridge-auth-divider"><span /> <p>Hoặc {activeTab === "register" ? "đăng ký" : "đăng nhập"} bằng</p> <span /></div><div className="ridge-auth-social-buttons"><button type="button" disabled title="Đăng nhập Google chưa được cấu hình">G</button><button type="button" disabled title="Đăng nhập Facebook chưa được cấu hình">f</button><button type="button" disabled title="Đăng nhập Apple chưa được cấu hình"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16.4 12.7c0-2.2 1.8-3.3 1.9-3.4a4.2 4.2 0 0 0-3.3-1.8c-1.4-.1-2.7.8-3.4.8s-1.8-.8-3-.8a4.4 4.4 0 0 0-3.7 2.3c-1.6 2.8-.4 7 1.2 9.3.8 1.1 1.7 2.3 2.9 2.2 1.2-.1 1.6-.7 3-.7s1.8.7 3 .7c1.2 0 2-1.1 2.8-2.3.9-1.3 1.2-2.6 1.2-2.7s-2.5-1-2.6-3.6ZM14.2 6a4.1 4.1 0 0 0 1-3 4.2 4.2 0 0 0-2.7 1.4 3.9 3.9 0 0 0-1 2.9 3.5 3.5 0 0 0 2.7-1.3Z"/></svg></button></div></div>
        </form>
      </section>
    </main>
  )
}


function RequireAuth() {
  const token = localStorage.getItem("token");

  return token ? <Outlet /> : <Navigate to="/" replace />;
}

function AuthRoute(){
  const token = localStorage.getItem('token');

  return token ? <Navigate to="/feed" replace/>:<AuthPage/>
}
function App() {

  return (
    <Routes>
      <Route path="/" element={<AuthRoute />} />
      <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          <Route path="feed" element={<FeedPage section="feed" />} />
          <Route path="messages" element={<MessagesViewRoute />} />
          <Route path="friends" element={<FeedPage section="connections" />} />
          <Route path="profile/:id" element={<ProfilePage embedded />} />
          <Route path="saved" element={<FeedPage section="saved" />} />
          <Route path="settings" element={<ProfileSettingsRoute />} />
          <Route path="admin" element={<AdminPanelRoute />} />
          <Route path="reels" element={<FeedPage section="reels" />} />
          <Route path="activity" element={<FeedPage section="activity" />} />
        </Route>
      </Route>
      <Route element={<AppOrGuestLayout />}>
        <Route path="feed" element={<TokenRoute guest={<GuestFeedPage />} authenticated={<FeedPage section="feed" />} />} />
        <Route path="profile/:id" element={<TokenRoute guest={<GuestProfilePage />} authenticated={<ProfilePage embedded />} />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
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
    <ProfileSettings
      currentUser={currentUser}
      onProfileSaved={(savedUser) => setCurrentUser((current) => ({
        ...current, ...savedUser, _id: savedUser.id || current?._id,
      }))}
    />
  </section>;
}

function AdminPanelRoute() {
  return <section className="feed-column feed-column-single"><AdminPanel /></section>;
}

export default App;
