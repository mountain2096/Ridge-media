import { useState } from 'react'
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import FeedPage from "./pages/FeedPage.jsx";
import './App.css'

function AuthPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("register");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState({type: "", text:""})
  const [isForgotPassword, setIsForgotPassword] = useState(false);
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

  async function handleForgotPassword(event){
    event.preventDefault();
    setFeedback({type:"", text:""});
    setIsSubmitting(true);

    try{
      const formData = new FormData(event.currentTarget);
      const email = formData.get("email");

      const response = await fetch(
        `http://localhost5000/api/auth/forgot-password`,
        {
          method:"POST",
          headers:{
            "Content-type": "application/json",
          },
          body:JSON.stringify({email})
        }
      );

      const data = await response.json();

      if(!response.ok){
        throw new Error(data.message || "Không thể gửi yêu cầu.");
      }

      setFeedback({
        type:"success",
        text:data.messag
      })
    } catch(err){
      setFeedback({
        type:"error",
        text: err.message || "Không thể kết nối máy chủ"
      })
    } finally{
      setIsSubmitting(false)
    }
  }
    setIsSubmitting(true)
    try{
    const formData = new FormData(event.currentTarget);
    const email = formData.get("email");
    const passwordValue = formData.get("password");
    const username = formData.get("username");

    const endpoint = 
    activeTab === "register" ? "/api/auth/register" : "/api/auth/login";

    const forgotPassword = "/api/auth/forgot-password"
    const requestBody = 
    activeTab === "register"
    ? {username, email, password: passwordValue}
    : {email, password: passwordValue};

    try{
      const response = await fetch(
        `http://localhost:5000${endpoint}`,
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
    <main className="auth-page">
      <section className="welcome-panel">
        <div className="brand">
          <span className ="brand-icon">R</span>
          <span>Ridge</span>
        </div>

        <div className ="welcome-message">
          <h1>WELCOME TO <br /> RIDGE</h1>
          <p>Connect, share, and discover with our community!</p>
        </div>

        <div className="panel-footer">
            <div className="avatar-row">
              <span className="avatar avatar-one">R</span>
              <span className="avatar avatar-two">I</span>
              <span className="avatar avatar-three">D</span>
              <span className="avatar avatar-four">G</span>
              <span className="avatar avatar-five">E</span>
            </div>
          <div className="bottom-brand">Ridge</div>
        </div>
      </section>

      <section className="form-panel">
        <div className="tabs">
          <button
            className={`tab ${activeTab === "register" ? "active" : ""}`}
            type="button"
            onClick={() => setActiveTab("register")}
          >
            Đăng ký
          </button>
          <button
            className={`tab ${activeTab === "login" ? "active" : ""}`}
            type="button"
            onClick={() => setActiveTab("login")}
          >
            Đăng nhập
          </button>
        </div>

        <div className="form-placeholders">
          {isForgotPassword ? 
            (<form className='register-form' onSubmit={isForgotPassword}>
              <input
              type="email"
              name="email"
              placeholder='Email'
              required/>

              <button
              className='submit-button'
              type="submit"
              disabled={isSubmitting}
              >
                {isSubmitting ? "Đang xử lý..." : "Gửi liên kết"}
              </button>

              {feedback.text && (
                <p className={`feedback-message ${feedback.type}`}>
                  {feedback.text}
                </p>
              )}

               <button
               className='back-button'
                type="button"
                onClick={() => {
                  setIsForgotPassword(false);
                  setFeedback({ type: "", text: "" });
                }}
              >
                Quay lại đăng nhập
              </button>
            </form>) 
            :
            (<form className="register-form" onSubmit={handleSubmit}>
            {activeTab === "register" && (
              <input type="text" name="username" placeholder="Họ và tên" required />
            )}
            <input type="email" name="email" placeholder="Email" required/>
            <input 
            type="password" 
            placeholder="Mật khẩu" 
            name="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={8}/>
            {activeTab === "register" && (
              <input 
              type="password" 
              placeholder="Xác nhận mật khẩu" 
              name="confirmPassword"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
              minLength={8}/>
            )}

            <button className="submit-button" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Đang xử lý..." : activeTab === "register" ? "Đăng ký" : "Đăng nhập"}
            </button>

            {activeTab !== "register" && (
              <a
              className='forgot-password'
              href='#'
              onClick={(event) =>{
                event.preventDefault();
                setFeedback({type:"", text:""});
                setIsForgotPassword(true);
              }}>
                Quên mật khẩu?
              </a>
            )}
            {feedback.text && (
              <p className={`feedback-message ${feedback.type}`}>{feedback.text}</p>
            )}
            <p className="form-note">
              {activeTab === "register"
                ? "Bạn đã có tài khoản? "
                : "Chưa có tài khoản? "}

              <a
                href="#"
                onClick={(event) => {
                  event.preventDefault();
                  setActiveTab(activeTab === "register" ? "login" : "register");
                }}
              >
                {activeTab === "register" ? "Đăng nhập ngay" : "Đăng ký ngay"}
              </a>
            </p>

            <div className="social-login">
              <div className="social-divider">
                <span></span>
                  <p>
                    Hoặc {activeTab === "register" ? "đăng ký" : "đăng nhập"} bằng
                  </p>
                    <span></span>
              </div>

              <div className="social-buttons">
                <button className="social-button google" type="button">G</button>
                <button className="social-button facebook" type="button">f</button>
                <button className="social-button apple" type="button">●</button>
              </div>
            </div>
          </form>)}
        </div>
      </section>
    </main>
  )
}


function ProtectedFeed() {
  const token = localStorage.getItem("token");

  return token ? <FeedPage /> : <Navigate to="/" replace />;
}

function AuthRoute(){
  const token = localStorage.getItem('token');

  return token ? <Navigate to="/feed" replace/>:<AuthPage/>
}
function App() {

  return (
    <Routes>
      <Route path="/" element={<AuthRoute />} />
      <Route
        path="/feed"
        element={<ProtectedFeed/>}
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;