import { resolveMediaUrl } from "../lib/api.js";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation, useOutletContext } from "react-router-dom";
import ReactionButton from "./ReactionButton.jsx";
import CommentItem from "./CommentItem.jsx";
import { useConfirm } from "./ConfirmDialog.jsx";
import ReportDialog from "./ReportDialog.jsx";
import Toast from "./Toast.jsx";
import { API_BASE } from "../lib/api.js";
import { mergeLegacyLikes, sendReaction, summarizeReactions } from "../lib/reactions.js";
import "../comments.css";
import "../reels.css";

const PAGE_SIZE = 6;

function ReelsView() {
  const confirmAction = useConfirm();
  const { currentUser } = useOutletContext();
  const location = useLocation();
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
  const [menuPostId, setMenuPostId] = useState("");
  const [reportPostId, setReportPostId] = useState("");
  const [toast, setToast] = useState("");
  const [sharingId, setSharingId] = useState("");
  const [expandedCaption, setExpandedCaption] = useState({});
  const [clampedCaptions, setClampedCaptions] = useState({});
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsError, setCommentsError] = useState("");
  const [commentContent, setCommentContent] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingCommentContent, setEditingCommentContent] = useState("");
  const [isUpdatingComment, setIsUpdatingComment] = useState(false);
  const [reportTarget, setReportTarget] = useState(null);
  const [sendingComment, setSendingComment] = useState(false);
  const containerRef = useRef(null);
  const videoRefs = useRef(new Map());
  const backdropRefs = useRef(new Map());
  const progressRefs = useRef(new Map());
  const menuRef = useRef(null);
  const captionRefs = useRef(new Map());
  const commentListRef = useRef(null);
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
      let pagePosts = data.posts;
      const targetId = nextPage === 1 && new URLSearchParams(location.search).get("post");
      if (targetId && !pagePosts.some((post) => post._id === targetId)) {
        const targetResponse = await fetch(`${API_BASE}/api/post/${encodeURIComponent(targetId)}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        const targetData = await targetResponse.json();
        if (targetResponse.ok && targetData.post) pagePosts = [targetData.post, ...pagePosts];
      }
      const playablePosts = [...new Map(pagePosts
        .filter((post) => !post.originalPostId && !post.originalUnavailable && (typeof post.video === "string" ? post.video : post.video?.url || post.video?.src))
        .map((post) => [post._id, post])).values()];
      if (targetId) playablePosts.sort((a, b) => Number(b._id === targetId) - Number(a._id === targetId));
      setPosts((current) => nextPage === 1 ? playablePosts : [...current, ...playablePosts.filter((post) => !current.some((item) => item._id === post._id))]);
      setPage(nextPage);
      setPages(data.pagination?.pages || 1);
    } catch (requestError) {
      setError(requestError.message || "Không thể tải Reels.");
    } finally {
      setLoading(false);
      pageRequest.current = false;
    }
  }, [location.search]);

  const commentsPost = posts.find((post) => post._id === commentsPostId);
  const reportPost = posts.find((post) => post._id === reportPostId);
  const commentIds = new Set(comments.map((item) => String(item._id)));
  const isReplyItem = (item) => Boolean(item.parentId) && commentIds.has(String(item.parentId));
  const topLevelComments = comments.filter((item) => !isReplyItem(item));
  const repliesOf = (parent) => comments.filter((item) => isReplyItem(item) && String(item.parentId) === String(parent._id));
  const renderComment = (comment, isReply = false, threadOptions = {}) => <CommentItem
    key={comment._id} comment={comment} currentUserId={currentUser?._id} postOwnerId={commentsPost?.authorId?._id} isAdmin={currentUser?.isAdmin}
    isReply={isReply} {...threadOptions}
    isEditing={editingCommentId === comment._id} editingContent={editingCommentContent} isUpdating={isUpdatingComment}
    onEdit={(item) => { setEditingCommentId(item._id); setEditingCommentContent(item.content || ""); }}
    onEditingChange={setEditingCommentContent} onCancelEdit={() => { setEditingCommentId(null); setEditingCommentContent(""); }}
    onUpdate={handleUpdateComment} onDelete={() => handleDeleteComment(comment)} onReport={() => setReportTarget({ targetType: "comment", targetId: comment._id })}
    onReact={(type) => handleReactComment(comment, type)}
    onReply={(item) => { setReplyTo({ rootId: item.parentId || item._id, username: item.authorId?.username || "người dùng" }); setCommentContent(item.authorId?.username ? `@${item.authorId.username} ` : ""); }}
  />;

  useEffect(() => {
    function onPointerDown(event) { if (!menuRef.current?.contains(event.target)) setMenuPostId(""); }
    function onKeyDown(event) {
      if (event.key !== "Escape") return;
      if (menuPostId) {
        setMenuPostId("");
        event.stopImmediatePropagation();
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown, true);
    return () => { document.removeEventListener("pointerdown", onPointerDown); document.removeEventListener("keydown", onKeyDown, true); };
  }, [commentsPostId, menuPostId]);

  useEffect(() => {
    let frame;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const next = {};
        captionRefs.current.forEach((element, id) => { next[id] = element.scrollHeight > element.clientHeight + 1; });
        setClampedCaptions(next);
      });
    };
    const observer = new ResizeObserver(measure);
    if (containerRef.current) observer.observe(containerRef.current);
    measure();
    return () => { observer.disconnect(); cancelAnimationFrame(frame); };
  }, [posts, ratios, expandedCaption]);

  useEffect(() => {
    const video = videoRefs.current.get(activeIndex);
    progressRefs.current.get(activeIndex)?.style.setProperty("--reel-progress", `${video?.duration ? video.currentTime / video.duration * 100 : 0}%`);
  }, [activeIndex]);

  useEffect(() => { if (!commentsLoading && comments.length) commentListRef.current?.scrollTo({ top: commentListRef.current.scrollHeight }); }, [comments, commentsLoading]);

  useEffect(() => {
    if (!commentsPostId || !commentPanelRef.current) return undefined;
    const index = posts.findIndex((post) => post._id === commentsPostId);
    const frame = containerRef.current?.querySelector(`.reel-item[data-index="${index}"] .reel-frame`);
    if (!frame) return undefined;
    const update = () => {
      const panel = commentPanelRef.current;
      if (!panel) return;
      if (window.matchMedia("(max-width: 900px)").matches) {
        panel.style.removeProperty("top");
        panel.style.removeProperty("height");
        panel.style.removeProperty("bottom");
      } else {
        const bounds = frame.getBoundingClientRect();
        const pageTop = document.querySelector(".reels-page").getBoundingClientRect().top;
        panel.style.top = `${bounds.top - pageTop}px`;
        panel.style.height = `${bounds.height}px`;
        panel.style.bottom = "auto";
      }
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(frame);
    window.addEventListener("resize", update);
    return () => { observer.disconnect(); window.removeEventListener("resize", update); };
  }, [commentsPostId, posts]);

  async function savePost(post) {
    try {
      const response = await fetch(`${API_BASE}/api/post/${post._id}/save`, { method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` }, body: JSON.stringify({ isSaved: !post.isSaved }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Không thể cập nhật bài viết đã lưu.");
      setPosts((current) => current.map((item) => item._id === post._id ? { ...item, isSaved: data.isSaved } : item));
    } catch (requestError) { setToast(requestError.message); }
  }

  async function sharePost(post) {
    setSharingId(post._id);
    try {
      const response = await fetch(`${API_BASE}/api/post/${post._id}/share`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` }, body: JSON.stringify({ caption: "" }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Không thể chia sẻ bài viết.");
      setToast(data.message);
    } catch (requestError) { setToast(requestError.message); } finally { setSharingId(""); }
  }

  async function submitReport({ reason, description }) {
    const target = reportTarget || { targetType: "post", targetId: reportPostId };
    const response = await fetch(`${API_BASE}/api/report`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` }, body: JSON.stringify({ ...target, reason, description }) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Không thể gửi báo cáo.");
    setToast(data.message);
  }
  const loadComments = useCallback(async (postId, { silent = false } = {}) => {
    const requestId = commentsRequestRef.current + 1;
    commentsRequestRef.current = requestId;
    if (!silent) setCommentsLoading(true);
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
      if (event.key === "Escape" && document.querySelector(".reel-post-menu, .ridge-comment-menu")) return;
      if (event.key === "Escape" && !document.querySelector(".ridge-react-picker")) {
        event.preventDefault();
        setCommentsPostId("");
        commentButtonRef.current?.focus();
      }
    }
    document.addEventListener("keydown", closeOnEscape, true);
    return () => {
      commentsRequestRef.current += 1;
      document.removeEventListener("keydown", closeOnEscape, true);
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
        body: JSON.stringify(replyTo ? { content, parentId: replyTo.rootId } : { content }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Không thể gửi bình luận.");
      setPosts((current) => current.map((post) => post._id === commentsPostId ? { ...post, commentsCount: (post.commentsCount || 0) + 1 } : post));
      setCommentContent("");
      setReplyTo(null);
      await loadComments(commentsPostId, { silent: true });
      commentInputRef.current?.focus();
    } catch (requestError) {
      setCommentsError(requestError.message || "Không thể gửi bình luận.");
    } finally {
      setSendingComment(false);
    }
  }

  async function handleReactComment(comment, type) {
    try {
      const data = await sendReaction(`/api/comment/${comment._id}/reaction`, type);
      setComments((current) => current.map((item) => item._id === comment._id ? { ...item, reactions: data.reactions } : item));
    } catch (requestError) { setCommentsError(requestError.message); }
  }

  async function handleDeleteComment(comment) {
    if (!(await confirmAction({ title: "Xóa bình luận", message: "Bạn có chắc muốn xóa bình luận này?", confirmLabel: "Xóa bình luận", danger: true }))) return;
    try {
      const response = await fetch(`${API_BASE}/api/comment/${comment._id}`, { method: "DELETE", headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Không thể xóa bình luận.");
      const removedCount = Number(data.removed) || 1;
      setComments((current) => current.filter((item) => item._id !== comment._id && String(item.parentId || "") !== String(comment._id)));
      setReplyTo((current) => current && current.rootId === comment._id ? null : current);
      setPosts((current) => current.map((post) => post._id === commentsPostId ? { ...post, commentsCount: Math.max(0, (post.commentsCount || 0) - removedCount) } : post));
    } catch (requestError) { setCommentsError(requestError.message); }
  }

  async function handleUpdateComment(event, commentId) {
    event.preventDefault();
    const content = editingCommentContent.trim();
    if (!content) { setCommentsError("Nội dung bình luận không được để trống."); return; }
    setIsUpdatingComment(true);
    try {
      const response = await fetch(`${API_BASE}/api/comment/${commentId}`, { method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` }, body: JSON.stringify({ content }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Không thể sửa bình luận.");
      setComments((current) => current.map((item) => item._id === commentId ? { ...item, content: data.comment.content } : item));
      setEditingCommentId(null);
      setEditingCommentContent("");
    } catch (requestError) { setCommentsError(requestError.message); }
    finally { setIsUpdatingComment(false); }
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
      setCommentsPostId((current) => current && posts[index]?._id !== current ? "" : current);
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
      const sidebarBounds = sidebar?.getBoundingClientRect();
      const topBar = sidebarBounds && sidebarBounds.width >= window.innerWidth - 2;
      const top = topBar ? sidebarBounds.bottom : header?.getBoundingClientRect().bottom;
      const left = topBar ? 0 : sidebarBounds?.right || 250;
      document.documentElement.style.setProperty("--reels-top", `${Math.max(0, top || 0)}px`);
      document.documentElement.style.setProperty("--reels-left", `${left}px`);
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
      document.documentElement.style.removeProperty("--reels-left");
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
      <div className="reels-container" data-lenis-prevent ref={containerRef} tabIndex={0} onKeyDown={handleKeyDown} aria-label="Danh sách Reels">
        {loading && posts.length === 0 && <p className="reel-state">Đang tải Reels...</p>}
        {error && posts.length === 0 && <div className="reel-state"><p>{error || "Không thể tải Reels."}</p><button type="button" onClick={() => loadPage(failedPage)}>Thử lại</button></div>}
        {!loading && !error && posts.length === 0 && <p className="reel-state">Chưa có Reels nào. Hãy đăng một bài viết kèm video để bài xuất hiện tại đây.</p>}
        {posts.map((post, index) => {
          const authorId = post.authorId?._id;
          const summary = summarizeReactions(mergeLegacyLikes(post.reactions, post.likes), currentUser?._id);
          const video = post.video;
          const videoSrc = resolveMediaUrl(typeof video === "string" ? video : video?.url || video?.src);
          const rawRatio = ratios[post._id] || 9 / 16;
          const ratio = Math.min(1, Math.max(9 / 16, rawRatio));
          return <article className="reel-item" data-index={index} key={post._id}>
            <div className={`reel-stage ${commentsPostId === post._id ? "has-comments" : ""}`}>
              <div className="reel-frame" style={{ "--reel-ratio": ratio }}>
            {index <= activeIndex + 1 && index >= activeIndex - 1 && rawRatio > 0.58 && <video className="reel-backdrop" ref={(element) => element ? backdropRefs.current.set(index, element) : backdropRefs.current.delete(index)} src={videoSrc} muted playsInline loop aria-hidden="true" tabIndex={-1} onLoadedMetadata={(event) => { if (index === activeIndex) event.currentTarget.play().catch(() => {}); }} />}
            <video className="reel-main-video" ref={(element) => element ? videoRefs.current.set(index, element) : videoRefs.current.delete(index)} src={videoSrc} playsInline loop preload="metadata" muted={muted} onLoadedMetadata={(event) => { const { videoWidth, videoHeight } = event.currentTarget; if (videoWidth && videoHeight) setRatios((current) => ({ ...current, [post._id]: videoWidth / videoHeight })); }} onTimeUpdate={(event) => { const main = event.currentTarget; const back = backdropRefs.current.get(index); if (back && Math.abs(back.currentTime - main.currentTime) > 0.5) back.currentTime = main.currentTime; if (index === activeIndex) progressRefs.current.get(index)?.style.setProperty("--reel-progress", `${main.duration ? main.currentTime / main.duration * 100 : 0}%`); }} onPlay={() => backdropRefs.current.get(index)?.play().catch(() => {})} onPause={() => backdropRefs.current.get(index)?.pause()} onSeeked={(event) => { const back = backdropRefs.current.get(index); if (back) back.currentTime = event.currentTarget.currentTime; }} onClick={(event) => event.currentTarget.paused ? event.currentTarget.play().catch(() => {}) : event.currentTarget.pause()} aria-label="Video Reels" />
            <div className="reel-overlay">
              <div className="reel-author">
                <Link to={authorId ? `/profile/${authorId}` : "#"} aria-label={`Trang cá nhân ${post.authorId?.username || "Người dùng"}`}>
                  <span className="reel-avatar">{post.authorId?.profilePicture ? <img src={resolveMediaUrl(post.authorId.profilePicture)} alt="" /> : post.authorId?.username?.charAt(0).toUpperCase()}</span>
                  <span>{post.authorId?.username || "Người dùng"}</span>
                </Link>
              </div>
              {post.content && <><p ref={(element) => element ? captionRefs.current.set(post._id, element) : captionRefs.current.delete(post._id)} className={`reel-caption ${expandedCaption[post._id] ? "is-expanded" : ""}`}>{post.content}</p>{(clampedCaptions[post._id] || expandedCaption[post._id]) && <button className="reel-caption-toggle" type="button" onClick={() => setExpandedCaption((current) => ({ ...current, [post._id]: !current[post._id] }))}>{expandedCaption[post._id] ? "Thu gọn" : "Xem thêm"}</button>}</>}
              </div>
              <button className="reel-mute" type="button" aria-label={muted ? "Bật tiếng" : "Tắt tiếng"} onClick={() => setMuted((value) => !value)}><svg viewBox="0 0 24 24" aria-hidden="true">{muted ? <><path d="M11 5 6 9H3v6h3l5 4z" /><path d="m16 9 5 6m0-6-5 6" /></> : <><path d="M11 5 6 9H3v6h3l5 4z" /><path d="M15 9a5 5 0 0 1 0 6m3-9a9 9 0 0 1 0 12" /></>}</svg></button>
              <div className="reel-progress" ref={(element) => element ? progressRefs.current.set(index, element) : progressRefs.current.delete(index)} style={{ "--reel-progress": "0%" }} />
              </div>
              <div className="reel-actions">
                <div className="reel-reaction"><ReactionButton compact iconOnly idleIcon={<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 8.8c0 5.2-8.8 10-8.8 10s-8.8-4.8-8.8-10A4.8 4.8 0 0 1 12 6.1a4.8 4.8 0 0 1 8.8 2.7Z" /></svg>} mine={summary.mine} onReact={(type) => handleReact(post, type)} idleLabel="Thích" /><span>{summary.total}</span></div>
                <button ref={commentsPostId === post._id ? commentButtonRef : null} className="reel-comments" type="button" aria-label={`Bình luận ${post.commentsCount || 0}`} aria-expanded={commentsPostId === post._id} onClick={() => { if (commentsPostId === post._id) { setCommentsPostId(""); commentButtonRef.current?.focus(); } else { commentButtonRef.current = document.activeElement; setCommentsPostId(post._id); } }}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" /></svg>{post.commentsCount || 0}</button>
                {(post.privacy === "public" || post.isMine) && <button className="reel-share" type="button" aria-label="Chia sẻ bài viết" disabled={sharingId === post._id} onClick={() => sharePost(post)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V3m0 0L7 8m5-5 5 5M5 13v7h14v-7" /></svg></button>}
                <div className="reel-more-wrap" ref={menuPostId === post._id ? menuRef : null}><button className="reel-more" type="button" aria-label="Tùy chọn bài viết" aria-haspopup="menu" aria-expanded={menuPostId === post._id} onClick={() => setMenuPostId(menuPostId === post._id ? "" : post._id)}><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/></svg></button>{menuPostId === post._id && <div className="post-menu reel-post-menu" role="menu"><button type="button" role="menuitem" onClick={() => { setMenuPostId(""); savePost(post); }}>{post.isSaved ? "Bỏ lưu bài viết" : "Lưu bài viết"}</button>{!post.isMine && <button className="danger" type="button" role="menuitem" onClick={() => { setMenuPostId(""); setReportPostId(post._id); }}>Báo cáo bài viết</button>}</div>}</div>
              </div>
            </div>
          </article>;
        })}
      </div>
      {error && posts.length > 0 && <div className="reel-page-error" role="alert"><span>{error || "Không thể tải Reels."}</span><button type="button" onClick={() => loadPage(failedPage)}>Thử lại</button></div>}
      {reactionError && <p className="reel-error" role="alert">{reactionError}</p>}
      <button className="reel-nav reel-nav-prev" type="button" aria-label="Reel trước" disabled={activeIndex === 0} hidden={Boolean(commentsPostId)} onClick={() => containerRef.current?.querySelectorAll(".reel-item")[Math.max(0, activeIndex - 1)]?.scrollIntoView({ behavior: "smooth" })}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 15 6-6 6 6" /></svg></button>
      <button className="reel-nav reel-nav-next" type="button" aria-label="Reel tiếp theo" disabled={activeIndex >= posts.length - 1} hidden={Boolean(commentsPostId)} onClick={() => containerRef.current?.querySelectorAll(".reel-item")[Math.min(posts.length - 1, activeIndex + 1)]?.scrollIntoView({ behavior: "smooth" })}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg></button>
      {commentsPost && <button type="button" className="reel-comments-backdrop" aria-label="Đóng bình luận" onClick={() => setCommentsPostId("")} />}
      {commentsPost && <aside className="reel-comments-panel" data-lenis-prevent ref={commentPanelRef} tabIndex={-1} aria-label="Bình luận" onClick={(event) => event.stopPropagation()}>
        <header><h2>Bình luận</h2><button type="button" aria-label="Đóng" onClick={() => { setCommentsPostId(""); commentButtonRef.current?.focus(); }}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg></button></header>
        <div className="reel-comment-list" ref={commentListRef} aria-live="polite">
          {commentsLoading ? <p>Đang tải bình luận...</p> : commentsError ? <div role="alert"><p>{commentsError}</p><button type="button" onClick={() => loadComments(commentsPostId)}>Thử lại</button></div> : comments.length === 0 ? <div className="reel-comments-empty"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" /></svg><p>Chưa có bình luận nào.</p></div> : topLevelComments.map((comment) => {
            const replies = repliesOf(comment);
            return replies.length ? <div className="ridge-comment-thread" key={comment._id}>{renderComment(comment, false, { isThreadParent: true, hasReplies: true })}<div className="ridge-replies">{replies.map((reply, index) => renderComment(reply, true, { isLastReply: index === replies.length - 1 }))}</div></div> : renderComment(comment);
          })}
        </div>
        {replyTo && <div className="ridge-reply-bar" role="status"><span>Đang trả lời <strong>{replyTo.username}</strong></span><button type="button" aria-label="Hủy trả lời" onClick={() => { setReplyTo(null); setCommentContent(""); }}>×</button></div>}
        <form onSubmit={handleCreateComment}><span className="reel-composer-avatar">{currentUser?.profilePicture ? <img src={resolveMediaUrl(currentUser.profilePicture)} alt="" /> : currentUser?.username?.charAt(0).toUpperCase()}</span><input ref={commentInputRef} value={commentContent} maxLength={500} onChange={(event) => setCommentContent(event.target.value)} placeholder={replyTo ? `Trả lời ${replyTo.username}...` : "Viết bình luận..."} aria-label="Viết bình luận..." /><button type="submit" aria-label="Gửi" disabled={sendingComment || !commentContent.trim()}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg></button></form>
      </aside>}
      <ReportDialog key={reportTarget?.targetId || reportPostId || "closed"} open={Boolean(reportPost || reportTarget)} targetType={reportTarget?.targetType || "post"} onClose={() => { setReportPostId(""); setReportTarget(null); }} onSubmit={submitReport} />
      <Toast message={toast} onDismiss={() => setToast("")} />
    </section>
  );
}

export default ReelsView;
