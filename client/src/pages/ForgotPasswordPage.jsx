import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
        `http://localhost:5000/api/auth/forgot-password`,
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
    return(
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
                <div className="form-placeholders">
                    <div className="tabs">
                        <h1>Quên mật khẩu</h1>
                    </div>
                <form className='register-form' onSubmit={handleForgotPassword}>
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
                    setFeedback({ type: "", text: "" });
                    navigate("/", {replace: true})
                    }}
                >
                    Quay lại đăng nhập
                </button>
                </form>
                </div>
            </section>
        </main>
    )
}
export default ForgotPasswordPage;