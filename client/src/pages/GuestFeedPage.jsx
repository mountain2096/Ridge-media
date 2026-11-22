import { useCallback, useEffect, useState } from "react";
import { API_BASE } from "../lib/api.js";
import GuestPostCard from "../components/GuestPostCard.jsx";

export default function GuestFeedPage() {
  const [page, setPage] = useState(1);
  const [posts, setPosts] = useState([]);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  const load = useCallback(async (target, append, signal) => {
    setLoading(true); setError("");
    try {
      const response = await fetch(`${API_BASE}/api/public/posts?page=${target}&limit=20`, { signal });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Không thể tải bảng tin.");
      setPosts((current) => append ? [...current, ...(data.posts || [])] : (data.posts || []));
      setPages(data.pagination?.pages || data.pages || 1);
      setPage(target);
    } catch (requestError) { if (requestError.name !== "AbortError") setError(requestError.message); }
    finally { if (!signal.aborted) setLoading(false); }
  }, []);

  useEffect(() => { const controller = new AbortController(); load(1, false, controller.signal); return () => controller.abort(); }, [attempt, load]);
  function loadMore() { const controller = new AbortController(); load(page + 1, true, controller.signal); }

  if (error && !posts.length) return <section className="guest-page-message" role="alert">{error}<br /><button className="guest-load-more" type="button" onClick={() => setAttempt((n) => n + 1)}>Thử lại</button></section>;
  if (loading && !posts.length) return <p className="guest-page-message">Đang tải bảng tin...</p>;
  if (!posts.length) return <p className="guest-page-message">Chưa có bài viết công khai.</p>;
  return <section aria-label="Bảng tin công khai">
    {posts.map((post) => <GuestPostCard key={post._id} post={post} />)}
    {error && <p className="guest-page-message" role="alert">{error} <button type="button" onClick={() => load(page + 1, true, new AbortController().signal)}>Thử lại</button></p>}
    {page < pages && <button className="guest-load-more" type="button" disabled={loading} onClick={loadMore}>{loading ? "Đang tải..." : "Tải thêm bài viết"}</button>}
  </section>;
}
