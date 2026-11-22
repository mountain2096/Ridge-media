import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { API_BASE } from "../lib/api.js";
import GuestPostCard from "../components/GuestPostCard.jsx";

export default function GuestProfilePage() {
  const { id } = useParams();
  const [profile, setProfile] = useState(null);
  const [profileId, setProfileId] = useState("");
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const [retryPosts, setRetryPosts] = useState(0);

  const loadPosts = useCallback(async (target, append, signal) => {
    try {
      const response = await fetch(`${API_BASE}/api/public/users/${id}/posts?page=${target}&limit=20`, { signal });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Không thể tải bài viết.");
      setPosts((current) => append ? [...current, ...(data.posts || [])] : (data.posts || []));
      setPages(data.pagination?.pages || data.pages || 1); setPage(target);
    } catch (requestError) { if (requestError.name !== "AbortError") setError(requestError.message); }
    finally { if (!signal.aborted) setLoading(false); }
  }, [id]);

  useEffect(() => {
    const controller = new AbortController(); let cancelled = false;
    fetch(`${API_BASE}/api/public/users/${id}`, { signal: controller.signal }).then(async (response) => {
      const data = await response.json();
      if (response.status === 404) { const missing = new Error("Người dùng không tồn tại."); missing.status = 404; throw missing; }
      if (!response.ok) throw new Error(data.message || "Không thể tải trang cá nhân.");
      if (!cancelled) { setProfile(data.user || data.profile || data); setProfileId(id); setError(""); }
    }).catch((requestError) => { if (!cancelled && requestError.name !== "AbortError") setError(requestError.status === 404 ? "Người dùng không tồn tại." : requestError.message); }).finally(() => { if (!cancelled) setLoading(false); });
    Promise.resolve().then(() => loadPosts(1, false, controller.signal));
    return () => { cancelled = true; controller.abort(); };
  }, [id, attempt, retryPosts, loadPosts]);

  if (profileId !== id && error) return <section className="guest-page-message" role="alert">{error}{error === "Người dùng không tồn tại." ? <><br /><Link to="/feed">Quay lại bảng tin</Link></> : <><br /><button className="guest-load-more" type="button" onClick={() => { setLoading(true); setError(""); setAttempt((n) => n + 1); setRetryPosts((n) => n + 1); }}>Thử lại</button></>}</section>;
  if (profileId !== id || !profile) return <p className="guest-page-message">Đang tải trang cá nhân...</p>;
  return <>
    <section className="guest-profile-shell">
      <div className={`public-profile-cover ${profile.coverPicture ? "has-cover" : ""}`}>{profile.coverPicture && <img src={profile.coverPicture} alt="Ảnh bìa" />}</div>
      <div className="guest-profile-summary"><div className="public-profile-avatar">{profile.profilePicture ? <img src={profile.profilePicture} alt={`Ảnh đại diện của ${profile.username}`} /> : profile.username?.charAt(0).toUpperCase()}</div>
        <div className="guest-profile-identity"><h1>{profile.username}</h1><p>{profile.bio || "Chưa có giới thiệu"}</p><div className="guest-profile-stats">{profile.friendCount ?? profile.friends?.length ?? 0} bạn bè · Tham gia {profile.createdAt ? new Date(profile.createdAt).toLocaleDateString("vi-VN") : ""}</div></div>
      </div>
    </section>
    <p className="guest-page-message guest-message"><Link to="/">Đăng nhập để kết bạn hoặc nhắn tin</Link></p>
    {posts.map((post) => <GuestPostCard key={post._id} post={post} />)}
    {error && <p className="guest-page-message" role="alert">{error} <button type="button" onClick={() => { setLoading(true); setError(""); setRetryPosts((n) => n + 1); }}>Thử lại</button></p>}
    {loading && !posts.length && <p className="guest-page-message">Đang tải bài viết...</p>}
    {page < pages && <button className="guest-load-more" type="button" disabled={loading} onClick={() => { setLoading(true); setError(""); const controller = new AbortController(); loadPosts(page + 1, true, controller.signal); }}>{loading ? "Đang tải..." : "Tải thêm bài viết"}</button>}
  </>;
}
