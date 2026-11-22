import { Link, Outlet } from "react-router-dom";
import "../newsfeed.css";
import "../profile.css";
import "../guest.css";

export default function GuestLayout() {
  return <div className="guest-layout">
    <header className="guest-topbar"><Link className="guest-brand" to="/feed"><span>R</span> Ridge</Link><nav><Link className="guest-login" to="/">Đăng nhập</Link><Link className="guest-register" to="/">Đăng ký</Link></nav></header>
    <p className="guest-notice">Bạn đang xem với tư cách khách</p>
    <main className="guest-main"><Outlet /></main>
  </div>;
}
