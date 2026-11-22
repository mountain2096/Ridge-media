import { Link } from "react-router-dom";

export default function GuestPostCard({ post }) {
  const shared = Boolean(post.originalPostId || post.originalUnavailable);
  const original = post.originalPostId && typeof post.originalPostId === "object" ? post.originalPostId : null;
  const username = post.authorId?.username || "Người dùng";
  const originalUsername = original?.authorId?.username || "Người dùng";
  const date = (value) => value ? new Date(value).toLocaleDateString("vi-VN", { day: "numeric", month: "short" }) : "Mới đăng";
  const media = shared ? original : post;
  const hasMedia = Boolean(media?.image || media?.video);

  return <article className="post-card card guest-post-card">
    <header className="post-header"><div className="post-author">
      <Link className="post-avatar" to={`/profile/${post.authorId?._id || post.authorId}`}>{post.authorId?.profilePicture ? <img src={post.authorId.profilePicture} alt="" /> : username.charAt(0).toUpperCase()}</Link>
      <div className="post-author-info"><div className="post-name-row"><Link className="profile-name-link" to={`/profile/${post.authorId?._id || post.authorId}`}>{username}</Link>{shared && <span className="post-share-label">đã chia sẻ một bài viết</span>}</div>
        <span className="post-meta"><span>Ridge</span><span aria-hidden="true">·</span><time dateTime={post.createdAt || undefined}>{date(post.createdAt)}</time>{!shared && post.editedAt && <><span aria-hidden="true">·</span><span>Đã chỉnh sửa</span></>}</span>
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
    <footer className="guest-post-footer">Đăng nhập để thích, bình luận hoặc chia sẻ · <Link to="/">Đăng nhập</Link></footer>
  </article>;
}
