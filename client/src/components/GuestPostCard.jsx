import { Link } from "react-router-dom";
import { mergeLegacyLikes, summarizeReactions } from "../lib/reactions.js";

export default function GuestPostCard({ post }) {
  const shared = Boolean(post.originalPostId || post.originalUnavailable);
  const original = post.originalPostId && typeof post.originalPostId === "object" ? post.originalPostId : null;
  const username = post.authorId?.username || "Người dùng";
  const originalUsername = original?.authorId?.username || "Người dùng";
  const date = (value) => value ? new Date(value).toLocaleDateString("vi-VN", { day: "numeric", month: "short" }) : "Mới đăng";
  const media = shared ? original : post;
  const hasMedia = Boolean(media?.image || media?.video);
  const reactionSummary = summarizeReactions(mergeLegacyLikes(post.reactions, post.likes));

  return <article className="post-card card guest-post-card">
    <header className="post-header"><div className="post-author">
      <Link className="post-avatar" to={`/profile/${post.authorId?._id || post.authorId}`}>{post.authorId?.profilePicture ? <img src={post.authorId.profilePicture} alt="" /> : username.charAt(0).toUpperCase()}</Link>
      <div className="post-author-info"><div className="post-name-row"><Link className="profile-name-link" to={`/profile/${post.authorId?._id || post.authorId}`}>{username}</Link>{shared && <span className="post-share-label">đã chia sẻ một bài viết</span>}</div>
        <span className="post-meta"><span>Ridge</span><span aria-hidden="true">·</span><time dateTime={post.createdAt || undefined}>{date(post.createdAt)}</time>{!shared && post.editedAt && <><span aria-hidden="true">·</span><span>Đã chỉnh sửa</span></>}<span aria-hidden="true">·</span>{post.privacy === "private" ? <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg> : post.privacy === "friends" ? <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg> : <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg>}<span>{post.privacy === "private" ? "Chỉ mình tôi" : post.privacy === "friends" ? "Bạn bè" : "Mọi người"}</span></span>
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
    {post.reactionTotal > 0 && <div className="ridge-post-reactions" aria-label={`${post.reactionTotal} lượt thả cảm xúc`}><span className="ridge-react-stack" aria-hidden="true">{reactionSummary.top.length ? reactionSummary.top.slice(0, 3).map((item) => <span key={item.type}>{item.emoji}</span>) : <><span className="ridge-reaction-heart"><svg viewBox="0 0 24 24"><path d="M20.8 8.7c0 5.3-8.8 10.1-8.8 10.1S3.2 14 3.2 8.7A4.2 4.2 0 0 1 12 6.8a4.2 4.2 0 0 1 8.8 1.9Z"/></svg></span><span className="ridge-reaction-like"><svg viewBox="0 0 24 24"><path d="M7 11v9H4v-9zM7 11l4-8c1.5 0 2.5 1 2 3l-.7 3H19a2 2 0 0 1 2 2.3l-1 6A2 2 0 0 1 18 20H7z"/></svg></span></>}</span><span>{post.reactionTotal} lượt thả cảm xúc</span></div>}
    <footer className="guest-post-footer">Đăng nhập để thích, bình luận hoặc chia sẻ · <Link to="/?tab=login">Đăng nhập</Link></footer>
  </article>;
}
