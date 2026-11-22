import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import ReactionButton from "./ReactionButton.jsx";
import { API_BASE } from "../lib/api.js";
import { mergeLegacyLikes, sendReaction, summarizeReactions } from "../lib/reactions.js";
import "../reels.css";

const PAGE_SIZE = 6;

function ReelsView() {
  const { currentUser } = useOutletContext();
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reactionError, setReactionError] = useState("");
  const [failedPage, setFailedPage] = useState(1);
  const [activeIndex, setActiveIndex] = useState(0);
  const [muted, setMuted] = useState(true);
  const containerRef = useRef(null);
  const videoRefs = useRef(new Map());
  const pageRequest = useRef(false);

  const loadPage = useCallback(async (nextPage = 1) => {
    if (pageRequest.current) return;
    pageRequest.current = true;
    setLoading(true);
    setError("");
    setFailedPage(nextPage);
    try {
      const response = await fetch(`${API_BASE}/api/post?media=video&page=${nextPage}&limit=${PAGE_SIZE}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Không thể tải Reels.");
      if (!Array.isArray(data.posts)) throw new Error("Không thể tải Reels.");
      setPosts((current) => nextPage === 1 ? data.posts : [...current, ...data.posts.filter((post) => !current.some((item) => item._id === post._id))]);
      setPage(nextPage);
      setPages(data.pagination?.pages || 1);
    } catch (requestError) {
      setError(requestError.message || "Không thể tải Reels.");
    } finally {
      setLoading(false);
      pageRequest.current = false;
    }
  }, []);

  useEffect(() => { Promise.resolve().then(loadPage); }, [loadPage]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return;
      const index = Number(visible.target.dataset.index);
      setActiveIndex(index);
      videoRefs.current.forEach((video, videoIndex) => {
        if (videoIndex === index) video.play().catch(() => {});
        else video.pause();
      });
    }, { root: container, threshold: 0.6 });
    container.querySelectorAll(".reel-item").forEach((item) => observer.observe(item));
    return () => observer.disconnect();
  }, [posts]);

  useEffect(() => {
    if (posts.length && activeIndex >= posts.length - 2 && page < pages && !pageRequest.current && !loading && !error) loadPage(page + 1);
  }, [activeIndex, error, loadPage, loading, page, pages, posts.length]);

  useEffect(() => {
    const header = document.querySelector(".home-topbar");
    const sidebar = document.querySelector(".home-sidebar");
    const updateOffset = () => {
      const narrow = window.matchMedia("(max-width: 900px)").matches;
      const offset = narrow ? sidebar?.getBoundingClientRect().bottom : header?.getBoundingClientRect().bottom;
      document.documentElement.style.setProperty("--reels-top", `${Math.max(0, offset || 0)}px`);
    };
    updateOffset();
    const observer = new ResizeObserver(updateOffset);
    if (header) observer.observe(header);
    if (sidebar) observer.observe(sidebar);
    window.addEventListener("resize", updateOffset);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateOffset);
      document.documentElement.style.removeProperty("--reels-top");
    };
  }, []);

  function handleKeyDown(event) {
    if (["INPUT", "TEXTAREA", "SELECT"].includes(event.target.tagName) || event.target.closest("[role='menu'], .ridge-react")) return;
    const direction = ["ArrowDown", "PageDown"].includes(event.key) ? 1 : ["ArrowUp", "PageUp"].includes(event.key) ? -1 : 0;
    if (!direction) return;
    event.preventDefault();
    containerRef.current?.querySelectorAll(".reel-item")[Math.max(0, Math.min(posts.length - 1, activeIndex + direction))]?.scrollIntoView({ behavior: "smooth" });
  }

  async function handleReact(post, type) {
    setReactionError("");
    try {
      const data = await sendReaction(`/api/post/${post._id}/reaction`, type);
      setPosts((current) => current.map((item) => item._id === post._id ? { ...item, reactions: data.reactions, likes: data.likes, isLiked: Boolean(type) } : item));
    } catch (requestError) {
      setReactionError(requestError.message);
      window.setTimeout(() => setReactionError(""), 3000);
    }
  }

  return (
    <section className="reels-page" aria-label="Reels">
      <div className="reels-container" ref={containerRef} tabIndex={0} onKeyDown={handleKeyDown} aria-label="Danh sách Reels">
        {loading && posts.length === 0 && <p className="reel-state">Đang tải Reels...</p>}
        {error && posts.length === 0 && <div className="reel-state"><p>{error || "Không thể tải Reels."}</p><button type="button" onClick={() => loadPage(failedPage)}>Thử lại</button></div>}
        {!loading && !error && posts.length === 0 && <p className="reel-state">Chưa có Reels nào. Hãy đăng một bài viết kèm video để bài xuất hiện tại đây.</p>}
        {posts.map((post, index) => {
          const authorId = post.authorId?._id;
          const summary = summarizeReactions(mergeLegacyLikes(post.reactions, post.likes), currentUser?._id);
          const video = post.video;
          const videoSrc = typeof video === "string" ? video : video?.url || video?.src;
          return <article className="reel-item" data-index={index} key={post._id}>
            <video ref={(element) => element ? videoRefs.current.set(index, element) : videoRefs.current.delete(index)} src={videoSrc} playsInline loop preload="metadata" muted={muted} onClick={(event) => event.currentTarget.paused ? event.currentTarget.play().catch(() => {}) : event.currentTarget.pause()} aria-label="Video Reels" />
            <div className="reel-overlay">
              <div className="reel-author">
                <Link to={authorId ? `/profile/${authorId}` : "#"} aria-label={`Trang cá nhân ${post.authorId?.username || "Người dùng"}`}>
                  <span className="reel-avatar">{post.authorId?.profilePicture ? <img src={post.authorId.profilePicture} alt="" /> : post.authorId?.username?.charAt(0).toUpperCase()}</span>
                  <span>{post.authorId?.username || "Người dùng"}</span>
                </Link>
              </div>
              {post.content && <p className="reel-caption">{post.content}</p>}
              <div className="reel-actions">
                <div className="reel-reaction"><ReactionButton compact iconOnly idleIcon={<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 8.8c0 5.2-8.8 10-8.8 10s-8.8-4.8-8.8-10A4.8 4.8 0 0 1 12 6.1a4.8 4.8 0 0 1 8.8 2.7Z" /></svg>} mine={summary.mine} onReact={(type) => handleReact(post, type)} idleLabel="Thích" /><span>{summary.total}</span></div>
                <span className="reel-comments" aria-label={`${post.commentsCount || 0} bình luận`}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" /></svg>{post.commentsCount || 0}</span>
                <button className="reel-mute" type="button" aria-label={muted ? "Bật tiếng" : "Tắt tiếng"} onClick={() => setMuted((value) => !value)}><svg viewBox="0 0 24 24" aria-hidden="true">{muted ? <><path d="M11 5 6 9H3v6h3l5 4z" /><path d="m16 9 5 6m0-6-5 6" /></> : <><path d="M11 5 6 9H3v6h3l5 4z" /><path d="M15 9a5 5 0 0 1 0 6m3-9a9 9 0 0 1 0 12" /></>}</svg><span>{muted ? "Bật tiếng" : "Tắt tiếng"}</span></button>
              </div>
            </div>
          </article>;
        })}
      </div>
      {error && posts.length > 0 && <div className="reel-page-error" role="alert"><span>{error || "Không thể tải Reels."}</span><button type="button" onClick={() => loadPage(failedPage)}>Thử lại</button></div>}
      {reactionError && <p className="reel-error" role="alert">{reactionError}</p>}
    </section>
  );
}

export default ReelsView;
