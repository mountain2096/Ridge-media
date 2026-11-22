import { useState } from "react";
import { useParams, useNavigate} from "react-router-dom";
import { API_BASE } from "../lib/api.js";
import "../auth.css";
function ResetPasswordPage(){
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [feedback, setFeedback] = useState({type:"", text:""});
    const { token } = useParams();
    const navigate = useNavigate();
    async function handleSubmit(event){
        event.preventDefault();
        setFeedback({type:"", text:""});

        if(password !== confirmPassword){
            setFeedback({
                type:"error",
                text:"Mật khẩu xác nhận không khớp với mật khẩu!"
            });
            return
        }
        setIsSubmitting(true);
try{
        const response = await fetch(
            `${API_BASE}/api/auth/reset-password/${token}`,
            {
                method:"POST",
                headers:{
                    "Content-type":"application/json"
                },
                body: JSON.stringify({password, confirmPassword})
            }
        )
        const data = await response.json();

        if(!response.ok){
            setFeedback({
                type:"error",
                text: data.message
            }) 
            return
        }

        setFeedback({
            type:"success",
            text:data.message
        })

        localStorage.removeItem("token")
        setTimeout(() =>{
            navigate("/", {replace: true})
        },1000)
    } catch(err){
            setFeedback({
                    type:"error",
                    text: err.message
                })
    } finally{
    setIsSubmitting(false)
    }
    }
    return (
      <main className="auth-page ridge-auth-page">
        <section className="ridge-auth-card" aria-labelledby="reset-title">
          <div className="ridge-auth-brand" aria-label="Ridge"><span className="ridge-auth-mark" aria-hidden="true">R</span><span>Ridge</span></div>
          <h1 className="ridge-auth-title" id="reset-title">Đặt lại mật khẩu</h1>
          <form className="ridge-auth-form" onSubmit={handleSubmit}>
            <p className="ridge-auth-hint">Mật khẩu cần ít nhất 8 ký tự, gồm chữ hoa, chữ thường và số.</p>
            <div className="ridge-auth-field"><label htmlFor="reset-password">Mật khẩu mới</label><div className="ridge-auth-password"><input id="reset-password" type={showPassword ? "text" : "password"} name="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} required /><button className="ridge-auth-toggle" type="button" aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"} onClick={() => setShowPassword((visible) => !visible)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.3-6 9.5-6 9.5 6 9.5 6-3.3 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.5"/></svg></button></div></div>
            <div className="ridge-auth-field"><label htmlFor="reset-confirm-password">Xác nhận mật khẩu mới</label><div className="ridge-auth-password"><input id="reset-confirm-password" type={showConfirmPassword ? "text" : "password"} name="confirmPassword" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} minLength={8} required /><button className="ridge-auth-toggle" type="button" aria-label={showConfirmPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"} onClick={() => setShowConfirmPassword((visible) => !visible)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.3-6 9.5-6 9.5 6 9.5 6-3.3 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.5"/></svg></button></div></div>
            <button className="ridge-auth-submit" type="submit" disabled={isSubmitting}>{isSubmitting ? "Đang xử lý..." : "Xác nhận"}</button>
            {feedback.text && <p className={`ridge-auth-feedback ${feedback.type}`} role={feedback.type === "error" ? "alert" : "status"} aria-live={feedback.type === "error" ? "assertive" : "polite"}>{feedback.text}</p>}
          </form>
        </section>
      </main>
    )
}
export default ResetPasswordPage;
