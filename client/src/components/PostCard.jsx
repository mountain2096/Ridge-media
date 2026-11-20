import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import CommentItem from "./CommentItem.jsx";

function PostCard({
  post, currentUser, isLiked, failedImagePost = false, editingPostId, editingPostContent, isSavingPost,
  postActionError, commentsOpen, comments = [], isLoadingComments = false, commentError = "",
  commentContent = "", isSendingComment = false, editingCommentId, editingCommentContent,
  isUpdatingComment = false, isSharing = false, onLike, onToggleComments, onShare, onToggleSaved,
  onStartEdit, onEditingPostContentChange, onUpdatePost, onCancelEditPost, onDeletePost, onReportPost,
  onCommentChange, onCreateComment, onCommentEdit, onCommentEditingChange,
  onCancelCommentEdit, onUpdateComment, onDeleteComment, onReportComment, onImageError,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const commentsRef = useRef(null);
  const isShare = Boolean(post.originalPostId || post.originalUnavailable);
  const originalPost = post.originalPostId && typeof post.originalPostId === "object" ? post.originalPostId : null;
  const visiblePost = isShare ? originalPost : post;
  const shareText = isShare && originalPost && post.content !== originalPost.content ? post.content : "";
  const username = post.authorId?.username || "Người dùng";
  const originalUsername = originalPost?.authorId?.username || "Người dùng";
  const authorId = post.authorId?._id;
  const hasMedia = Boolean(visiblePost?.image || visiblePost?.video);
  const postDate = post.createdAt
    ? new Date(post.createdAt).toLocaleDateString("vi-VN", { day: "numeric", month: "short" })
    : "Mới đăng";
  const fullDate = post.createdAt ? new Date(post.createdAt).toLocaleString("vi-VN") : "";
  const originalFullDate = originalPost?.createdAt ? new Date(originalPost.createdAt).toLocaleString("vi-VN") : "";
  const originalDate = originalPost?.createdAt ? new Date(originalPost.createdAt).toLocaleDateString("vi-VN", { day: "numeric", month: "short" }) : "";
  const visibilityLabel = post.privacy === "private" ? "Chỉ mình tôi" : post.privacy === "friends" ? "Bạn bè" : "Mọi người";
  const ownsPost = Boolean(post.isMine);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onPointerDown = (event) => { if (!menuRef.current?.contains(event.target)) setMenuOpen(false); };
    const onKeyDown = (event) => { if (event.key === "Escape") setMenuOpen(false); };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (commentsOpen) commentsRef.current?.querySelector("input")?.focus();
  }, [commentsOpen]);

  return (
    <article className="post-card card" id={`post-${post._id}`}>
      <header className="post-header">
        <div className="post-author">
          <Link className="post-avatar" to={authorId ? `/profile/${authorId}` : "#"} aria-label={`Xem trang cá nhân ${username}`}>
            {post.authorId?.profilePicture ? <img src={post.authorId.profilePicture} alt="" /> : username.charAt(0).toUpperCase()}
          </Link>
          <div className="post-author-info">
            <div className="post-name-row"><Link className="profile-name-link" to={authorId ? `/profile/${authorId}` : "#"}>{username}</Link>{isShare && <span className="post-share-label">đã chia sẻ một bài viết</span>}</div>
            <span className="post-meta">
              <span>Ridge</span><span aria-hidden="true">·</span><time dateTime={post.createdAt || undefined} title={fullDate}>{postDate}</time><span aria-hidden="true">·</span>
              <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0-18" /></svg>
              <span>{visibilityLabel}</span>
            </span>
          </div>
        </div>
        <div className="post-menu-wrap" ref={menuRef}>
          <button className="post-more" type="button" aria-label="Tùy chọn bài viết" aria-haspopup="menu" aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="19" cy="12" r="1.8" /></svg>
          </button>
          {menuOpen && <div className="post-menu" role="menu" aria-label="Tùy chọn bài viết">
            <button type="button" role="menuitem" onClick={() => { onToggleSaved?.(post, Boolean(post.isSaved)); setMenuOpen(false); }}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4.5L5 21V4a1 1 0 0 1 1-1z" /></svg>{post.isSaved ? "Bỏ lưu bài viết" : "Lưu bài viết"}
            </button>
            {!ownsPost && <button className="danger" type="button" role="menuitem" onClick={() => { setMenuOpen(false); onReportPost?.(post); }}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 21V4m0 0h11l-2 4 2 4H5" /></svg>Báo cáo bài viết
            </button>}
            {ownsPost && <>
              <button type="button" role="menuitem" onClick={() => { onStartEdit?.(post); setMenuOpen(false); }}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 5 4 4M4 20l4.5-1 10-10a2.1 2.1 0 0 0-3-3l-10 10L4 20z" /></svg>Chỉnh sửa bài viết</button>
              <button className="post-menu-delete" type="button" role="menuitem" onClick={() => { setMenuOpen(false); onDeletePost?.(post); }}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M5 7l1 14h12l1-14M9 7V4h6v3" /></svg>Xóa bài viết</button>
            </>}
          </div>}
        </div>
      </header>

      {visiblePost.video ? <video className="post-video" src={visiblePost.video} controls preload="metadata" /> : visiblePost.image && !failedImagePost ? <img className="post-image" src={visiblePost.image} alt={`Bài viết của ${username}`} loading="lazy" onError={() => onImageError?.(post)} /> : null}
      {isShare && shareText && <p className="post-caption post-share-text">{shareText}</p>}
      {isShare ? <article className="shared-post-card">
        {originalPost ? <>
          <header className="shared-post-header">
            <Link className="shared-post-avatar" to={originalPost.authorId?._id ? `/profile/${originalPost.authorId._id}` : "#"} aria-label={`Xem trang cá nhân ${originalUsername}`}>
              {originalPost.authorId?.profilePicture ? <img src={originalPost.authorId.profilePicture} alt="" /> : originalUsername.charAt(0).toUpperCase()}
            </Link>
            <div><Link className="profile-name-link" to={originalPost.authorId?._id ? `/profile/${originalPost.authorId._id}` : "#"}>{originalUsername}</Link><time title={originalFullDate}>{originalDate}</time></div>
          </header>
          {originalPost.content && <p className={originalPost.image || originalPost.video ? "post-caption" : "post-text"}>{originalPost.content}</p>}
          {originalPost.image && <img className="shared-post-media" src={originalPost.image} alt={`Bài viết của ${originalUsername}`} loading="lazy" />}
          {originalPost.video && <video className="shared-post-media" src={originalPost.video} controls preload="metadata" />}
        </> : <p className="shared-post-unavailable">Nội dung này không còn khả dụng.</p>}
      </article> : <>
      {editingPostId === post._id ? <form className="post-edit-form" onSubmit={(event) => onUpdatePost(event, post)}>
        <textarea value={editingPostContent} onChange={(event) => onEditingPostContentChange?.(event.target.value)} maxLength="500" aria-label="Chỉnh sửa nội dung bài viết" />
        {postActionError && <p className="feedback-message error" role="alert">{postActionError}</p>}
        <div><button type="submit" disabled={isSavingPost}>{isSavingPost ? "Đang lưu..." : "Lưu"}</button><button type="button" onClick={() => onCancelEditPost?.()}>Hủy</button></div>
      </form> : visiblePost?.content && <p className={hasMedia ? "post-caption" : "post-text"}>{hasMedia && <><strong>{username}</strong>{" "}</>}{visiblePost.content}</p>}
      </>}

      <div className="post-stats">
        <p className="post-likes">{post.likes?.length ?? 0} lượt thích</p>
        <button className="post-comment-count" type="button" onClick={() => onToggleComments?.(post)}>{post.commentsCount ?? 0} bình luận</button>
      </div>
      <div className="post-actions">
        <div className="post-action-group">
          <button className={`post-action-button ${isLiked ? "liked" : ""}`} type="button" aria-label={isLiked ? "Bỏ thích" : "Thích"} aria-pressed={Boolean(isLiked)} onClick={() => onLike?.(post)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.5s-8-4.9-8-11A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 8 2.5c0 6.1-8 11-8 11z" /></svg><span>{isLiked ? "Đã thích" : "Thích"}</span></button>
          <button className="post-action-button" type="button" aria-label="Bình luận" onClick={() => onToggleComments?.(post)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 15a3 3 0 0 1-3 3H9l-5 4V6a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3z" /></svg><span>Bình luận</span></button>
          <button className="post-action-button" type="button" disabled={isSharing} onClick={() => onShare?.(post)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M22 3 11 14M22 3l-7 18-4-7-7-4z" /></svg><span>{isSharing ? "Đang chia sẻ" : "Chia sẻ"}</span></button>
        </div>
        <button className={`post-action-button ${post.isSaved ? "saved" : ""}`} type="button" aria-label={post.isSaved ? "Bỏ lưu bài viết" : "Lưu bài viết"} aria-pressed={Boolean(post.isSaved)} onClick={() => onToggleSaved?.(post, Boolean(post.isSaved))}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4.5L5 21V4a1 1 0 0 1 1-1z" /></svg></button>
      </div>

      {commentsOpen && <div className="post-comments profile-comments ridge-comments-list" ref={commentsRef}>
        <div className="comments-list">
          {isLoadingComments && <p>Đang tải bình luận...</p>}
          {!isLoadingComments && commentError && <p className="feedback-message error" role="alert">{commentError}</p>}
          {!isLoadingComments && !commentError && comments.length === 0 && <p>Chưa có bình luận nào.</p>}
          {!isLoadingComments && !commentError && comments.map((comment) => <CommentItem
            key={comment._id} comment={comment} currentUserId={currentUser?._id} postOwnerId={authorId} isAdmin={currentUser?.isAdmin}
            isEditing={editingCommentId === comment._id} editingContent={editingCommentContent} isUpdating={isUpdatingComment}
            onEdit={onCommentEdit} onEditingChange={onCommentEditingChange} onCancelEdit={onCancelCommentEdit}
            onUpdate={onUpdateComment} onDelete={() => onDeleteComment?.(comment)} onReport={() => onReportComment?.(comment)}
          />)}
        </div>
        <form className="comment-form profile-comment-form" onSubmit={(event) => onCreateComment?.(event, post)}>
          <input type="text" placeholder="Viết bình luận..." aria-label="Viết bình luận" maxLength="500" value={commentContent} onChange={(event) => onCommentChange?.(event.target.value)} />
          <button type="submit" disabled={isSendingComment}>{isSendingComment ? "Đang gửi..." : "Gửi"}</button>
        </form>
      </div>}
    </article>
  );
}

export default PostCard;
