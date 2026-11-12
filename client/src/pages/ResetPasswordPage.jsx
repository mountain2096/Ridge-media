import { useState } from "react";
import { useParams, useNavigate} from "react-router-dom";
function ResetPasswordPage(){
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
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
            `http://localhost:5000/api/auth/reset-password/${token}`,
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
                        <h1>Đặt lại mật khẩu</h1>
                    </div>
                    <form className="register-form" onSubmit={handleSubmit}>
                        <input
                        type="password"
                        name="password"
                        placeholder="Mật khẩu mới"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        minLength={6}
                        required 
                        />

                        <input
                        type="password"
                        placeholder="Xác nhận mật khẩu mới"
                        name="confirmPassword"
                        value={confirmPassword}
                        onChange={(event) => setConfirmPassword(event.target.value)}
                        minLength={6}
                        required></input>

                        <button className="submit-button" type="submit" disabled={isSubmitting}>{isSubmitting ? "Đang xử lý..." : "Xác nhận"}</button>
                        {feedback.text && (
                            <p className={`feedback-message ${feedback.type}`}>
                                {feedback.text}
                            </p>
                        )}
                    </form>
                </div>
            </section>
        </main>
    )
}
export default ResetPasswordPage;
