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
  const [ratios, setRatios] = useState({});
  const [commentsPostId, setCommentsPostId] = useState("");
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsError, setCommentsError] = useState("");
  const [commentContent, setCommentContent] = useState("");
  const [sendingComment, setSendingComment] = useState(false);
  const containerRef = useRef(null);
  const videoRefs = useRef(new Map());
  const commentButtonRef = useRef(null);
  const commentPanelRef = useRef(null);
  const commentInputRef = useRef(null);
  const commentsRequestRef = useRef(0);
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

  const commentsPost = posts.find((post) => post._id === commentsPostId);
  const loadComments = useCallback(async (postId) => {
    const requestId = commentsRequestRef.current + 1;
    commentsRequestRef.current = requestId;
    setCommentsLoading(true);
    setCommentsError("");
    try {
      const response = await fetch(`${API_BASE}/api/comment/${postId}`, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Không thể tải bình luận.");
      if (commentsRequestRef.current === requestId) setComments(data.comment || []);
    } catch (requestError) {
      if (commentsRequestRef.current === requestId) setCommentsError(requestError.message || "Không thể tải bình luận.");
    } finally {
      if (commentsRequestRef.current === requestId) setCommentsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!commentsPostId) return undefined;
    Promise.resolve().then(() => loadComments(commentsPostId));
    commentPanelRef.current?.focus();
    function closeOnEscape(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        setCommentsPostId("");
        commentButtonRef.current?.focus();
      }
    }
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      commentsRequestRef.current += 1;
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [commentsPostId, loadComments]);

  async function handleCreateComment(event) {
    event.preventDefault();
    const content = commentContent.trim();
    if (!content || !commentsPostId) return;
    setSendingComment(true);
    setCommentsError("");
    try {
      const response = await fetch(`${API_BASE}/api/comment/${commentsPostId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` },
        body: JSON.stringify({ content }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Không thể gửi bình luận.");
      setPosts((current) => current.map((post) => post._id === commentsPostId ? { ...post, commentsCount: (post.commentsCount || 0) + 1 } : post));
      setCommentContent("");
      await loadComments(commentsPostId);
      commentInputRef.current?.focus();
    } catch (requestError) {
      setCommentsError(requestError.message || "Không thể gửi bình luận.");
    } finally {
      setSendingComment(false);
    }
  }

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
    if (["INPUT", "TEXTAREA", "SELECT"].includes(event.target.tagName) || event.target.closest("[role='menu'], .ridge-react, .reel-comments-panel")) return;
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
            <div className={`reel-stage ${(ratios[post._id] || 9 / 16) < 0.8 ? "is-portrait" : "is-wide"}`}>
              <div className={`reel-frame ${(ratios[post._id] || 9 / 16) < 0.8 ? "is-portrait" : "is-wide"}`} style={{ "--reel-ratio": ratios[post._id] || 9 / 16 }}>
            <video ref={(element) => element ? videoRefs.current.set(index, element) : videoRefs.current.delete(index)} src={videoSrc} playsInline loop preload="metadata" muted={muted} onLoadedMetadata={(event) => { const { videoWidth, videoHeight } = event.currentTarget; if (videoWidth && videoHeight) setRatios((current) => ({ ...current, [post._id]: videoWidth / videoHeight })); }} onClick={(event) => event.currentTarget.paused ? event.currentTarget.play().catch(() => {}) : event.currentTarget.pause()} aria-label="Video Reels" />
            <div className="reel-overlay">
              <div className="reel-author">
                <Link to={authorId ? `/profile/${authorId}` : "#"} aria-label={`Trang cá nhân ${post.authorId?.username || "Người dùng"}`}>
                  <span className="reel-avatar">{post.authorId?.profilePicture ? <img src={post.authorId.profilePicture} alt="" /> : post.authorId?.username?.charAt(0).toUpperCase()}</span>
                  <span>{post.authorId?.username || "Người dùng"}</span>
                </Link>
              </div>
              {post.content && <p className="reel-caption">{post.content}</p>}
              </div>
              </div>
              <div className="reel-actions">
                <div className="reel-reaction"><ReactionButton compact iconOnly idleIcon={<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 8.8c0 5.2-8.8 10-8.8 10s-8.8-4.8-8.8-10A4.8 4.8 0 0 1 12 6.1a4.8 4.8 0 0 1 8.8 2.7Z" /></svg>} mine={summary.mine} onReact={(type) => handleReact(post, type)} idleLabel="Thích" /><span>{summary.total}</span></div>
                <button ref={commentsPostId === post._id ? commentButtonRef : null} className="reel-comments" type="button" aria-label={`Bình luận ${post.commentsCount || 0}`} aria-expanded={commentsPostId === post._id} onClick={() => { if (commentsPostId === post._id) { setCommentsPostId(""); commentButtonRef.current?.focus(); } else { commentButtonRef.current = document.activeElement; setCommentsPostId(post._id); } }}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" /></svg>{post.commentsCount || 0}</button>
                <button className="reel-mute" type="button" aria-label={muted ? "Bật tiếng" : "Tắt tiếng"} onClick={() => setMuted((value) => !value)}><svg viewBox="0 0 24 24" aria-hidden="true">{muted ? <><path d="M11 5 6 9H3v6h3l5 4z" /><path d="m16 9 5 6m0-6-5 6" /></> : <><path d="M11 5 6 9H3v6h3l5 4z" /><path d="M15 9a5 5 0 0 1 0 6m3-9a9 9 0 0 1 0 12" /></>}</svg><span>{muted ? "Bật tiếng" : "Tắt tiếng"}</span></button>
              </div>
            </div>
          </article>;
        })}
      </div>
      {error && posts.length > 0 && <div className="reel-page-error" role="alert"><span>{error || "Không thể tải Reels."}</span><button type="button" onClick={() => loadPage(failedPage)}>Thử lại</button></div>}
      {reactionError && <p className="reel-error" role="alert">{reactionError}</p>}
      {commentsPost && <aside className="reel-comments-panel" ref={commentPanelRef} tabIndex={-1} aria-label="Bình luận" onClick={(event) => event.stopPropagation()}>
        <header><h2>Bình luận</h2><button type="button" aria-label="Đóng" onClick={() => { setCommentsPostId(""); commentButtonRef.current?.focus(); }}>Đóng</button></header>
        <div className="reel-comment-list" aria-live="polite">
          {commentsLoading ? <p>Đang tải bình luận...</p> : commentsError ? <div role="alert"><p>{commentsError}</p><button type="button" onClick={() => loadComments(commentsPostId)}>Thử lại</button></div> : comments.length === 0 ? <p>Chưa có bình luận nào.</p> : comments.filter((comment) => !comment.parentId).map((comment) => <div className="reel-comment" key={comment._id}>
            <Link to={`/profile/${comment.authorId?._id}`}>{comment.authorId?.username || "Người dùng"}</Link><p>{comment.content}</p><time>{comment.createdAt ? new Date(comment.createdAt).toLocaleString("vi-VN") : ""}</time>
            {comments.filter((reply) => String(reply.parentId || "") === String(comment._id)).map((reply) => <div className="reel-comment is-reply" key={reply._id}><Link to={`/profile/${reply.authorId?._id}`}>{reply.authorId?.username || "Người dùng"}</Link><p>{reply.content}</p><time>{reply.createdAt ? new Date(reply.createdAt).toLocaleString("vi-VN") : ""}</time></div>)}
          </div>)}
        </div>
        <form onSubmit={handleCreateComment}><input ref={commentInputRef} value={commentContent} maxLength={500} onChange={(event) => setCommentContent(event.target.value)} placeholder="Viết bình luận..." aria-label="Viết bình luận..." /><button type="submit" disabled={sendingComment || !commentContent.trim()}>{sendingComment ? "Đang gửi..." : "Gửi"}</button></form>
      </aside>}
    </section>
  );
}

export default ReelsView;
