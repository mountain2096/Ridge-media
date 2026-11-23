import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "../lib/api.js";
import "../auth.css";
function ForgotPasswordPage(){
    const [feedback, setFeedback] = useState({type:"", text:""});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const navigate = useNavigate();
    async function handleForgotPassword(event){
    event.preventDefault();
    setFeedback({type:"", text:""});
    setIsSubmitting(true);

    try{
      const formData = new FormData(event.currentTarget);
      const email = formData.get("email");

      const response = await fetch(
        `${API_BASE}/api/auth/forgot-password`,
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
        text:data.message
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
    return (
      <main className="auth-page ridge-auth-page">
        <section className="ridge-auth-card" aria-labelledby="forgot-title">
          <div className="ridge-auth-brand" aria-label="Ridge"><span className="ridge-auth-mark" aria-hidden="true">R</span><span>Ridge</span></div>
          <h1 className="ridge-auth-title" id="forgot-title">Quên mật khẩu</h1>
          <form className="ridge-auth-form" onSubmit={handleForgotPassword}>
            <div className="ridge-auth-field"><label htmlFor="forgot-email">Email</label><input id="forgot-email" type="email" name="email" autoComplete="email" required /></div>
            <button className="ridge-auth-submit" type="submit" disabled={isSubmitting}>{isSubmitting ? "Đang xử lý..." : "Gửi liên kết"}</button>
            {feedback.text && <p className={`ridge-auth-feedback ${feedback.type}`} role={feedback.type === "error" ? "alert" : "status"} aria-live={feedback.type === "error" ? "assertive" : "polite"}>{feedback.text}</p>}
            <button className="ridge-auth-back" type="button" onClick={() => { setFeedback({ type: "", text: "" }); navigate("/", {replace: true}) }}>Quay lại đăng nhập</button>
          </form>
        </section>
      </main>
    )
}
export default ForgotPasswordPage;
