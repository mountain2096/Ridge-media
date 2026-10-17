import { useState } from 'react'
import heroImg from './assets/hero.png'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import './App.css'

function App() {
  const [activeTab, setActiveTab] = useState("register");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  async function handleSubmit(event) {
    event.preventDefault();

    if(activeTab === "register" && password !== confirmPassword) {
      alert("Mật khẩu và xác nhận mật khẩu không khớp!");
      return;
    }
    
    const formData = new FormData(event.currentTarget);
    const email = formData.get("email");
    const passwordValue = formData.get("password");
    const username = formData.get("username");

    const endpoint = 
    activeTab === "register" ? "/api/auth/register" : "/api/auth/login";

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
        throw new Error(data.message || "Yêu cầu thành công!");
    }

    if(activeTab === "login") {
      localStorage.setItem("token", data.token);
    }

    alert(data.message);
    }catch(error) {
      alert(error.message || "Đã xảy ra lỗi!");
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
          <form className="register-form" onSubmit={handleSubmit}>
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
            required/>
            {activeTab === "register" && (
              <input 
              type="password" 
              placeholder="Xác nhận mật khẩu" 
              name="confirmPassword"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required/>
            )}

            <button className="submit-button" type="submit">
              {activeTab === "register" ? "Đăng ký" : "Đăng nhập"}
            </button>

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
          </form>
        </div>
      </section>
    </main>
  )
}

export default App