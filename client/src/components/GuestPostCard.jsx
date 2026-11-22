import { Link } from "react-router-dom";

export default function GuestPostCard({ post }) {
  const shared = Boolean(post.originalPostId || post.originalUnavailable);
  const original = post.originalPostId && typeof post.originalPostId === "object" ? post.originalPostId : null;
  const username = post.authorId?.username || "Người dùng";
  const originalUsername = original?.authorId?.username || "Người dùng";
  const date = (value) => value ? new Date(value).toLocaleDateString("vi-VN", { day: "numeric", month: "short" }) : "Mới đăng";
  const media = shared ? original : post;
  const hasMedia = Boolean(media?.image || media?.video);
  const privacyLabel = post.privacy === "private" ? "Chỉ mình tôi" : post.privacy === "friends" ? "Bạn bè" : "Mọi người";

  return <article className="post-card card guest-post-card">
    <header className="post-header"><div className="post-author">
      <Link className="post-avatar" to={`/profile/${post.authorId?._id || post.authorId}`}>{post.authorId?.profilePicture ? <img src={post.authorId.profilePicture} alt="" /> : username.charAt(0).toUpperCase()}</Link>
      <div className="post-author-info"><div className="post-name-row"><Link className="profile-name-link" to={`/profile/${post.authorId?._id || post.authorId}`}>{username}</Link>{shared && <span className="post-share-label">đã chia sẻ một bài viết</span>}</div>
        <span className="post-meta"><span>Ridge</span><span aria-hidden="true">·</span><time dateTime={post.createdAt || undefined}>{date(post.createdAt)}</time>{!shared && post.editedAt && <><span aria-hidden="true">·</span><span>Đã chỉnh sửa</span></>}<span aria-hidden="true">·</span><svg viewBox="0 0 24 24" aria-hidden="true">{post.privacy === "private" ? <><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 1 1 8 0v3" /></> : post.privacy === "friends" ? <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></> : <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></>}</svg><span>{privacyLabel}</span></span>
      </div>
    </div></header>
    {!shared && post.video && <video className="post-video" src={post.video} controls preload="metadata" />}
    {!shared && post.image && <img className="post-image" src={post.image} alt={`Bài viết của ${username}`} loading="lazy" />}
    {shared ? <>
      {original && post.content && post.content.trim() !== (original.content || "").trim() && <p className="post-caption post-share-text">{post.content}</p>}
      <article className="shared-post-card">{original ? <>
        <header className="shared-post-header"><Link className="shared-post-avatar" to={`/profile/${original.authorId?._id || original.authorId}`}>{original.authorId?.profilePicture ? <img src={original.authorId.profilePicture} alt="" /> : originalUsername.charAt(0).toUpperCase()}</Link><div><Link className="profile-name-link" to={`/profile/${original.authorId?._id || original.authorId}`}>{originalUsername}</Link><time>{date(original.createdAt)}</time></div></header>
        {original.content && <p className={original.image || original.video ? "post-caption" : "post-text"}>{original.content}</p>}
        {original.image && <img className="shared-post-media" src={original.image} alt={`Bài viết của ${originalUsername}`} loading="lazy" />}
        {original.video && <video className="shared-post-media" src={original.video} controls preload="metadata" />}
      </> : <p className="shared-post-unavailable">Nội dung này không còn khả dụng.</p>}</article>
    </> : post.content && <p className={hasMedia ? "post-caption" : "post-text"}>{hasMedia && <><strong>{username}</strong>{" "}</>}{post.content}</p>}
    <div className="post-stats"><span>{post.reactionTotal ?? 0} lượt thích</span><span>{post.commentsCount ?? 0} bình luận</span></div>
    <footer className="guest-post-footer">Đăng nhập để thích, bình luận hoặc chia sẻ · <Link to="/?tab=login">Đăng nhập</Link></footer>
  </article>;
}
