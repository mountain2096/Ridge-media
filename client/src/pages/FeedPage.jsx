import { useNavigate } from "react-router-dom";     

function FeedPage(){
    const navigate = useNavigate();

    function handleLogout(){
        localStorage.removeItem("token");
        navigate("/", {replace: true})
    }

    return (
        <main className="feed-page">
            <h1>Chào mừng đến với Ridge</h1>
            <p>Bạn đã đăng nhập</p>
            <button className="submit-button" onClick={handleLogout}>Đăng xuất</button>
        </main>
    );
}
export default FeedPage;