import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useOutletContext, useParams } from "react-router-dom";
import { API_BASE } from "../lib/api.js";
import { useConfirm } from "../components/ConfirmDialog.jsx";
import ReportDialog from "../components/ReportDialog.jsx";
import Toast from "../components/Toast.jsx";
import CommentItem from "../components/CommentItem.jsx";
import "../newsfeed.css";
import "../profile.css";

const API = `${API_BASE}/api`;

function ProfilePage({ profileId, embedded = false }) {
  const { id: routeId } = useParams();
  const id = profileId || routeId;
  const ProfileRoot = embedded ? "div" : "main";
  const navigate = useNavigate();
  const { currentUser } = useOutletContext();
  const confirmAction = useConfirm();
  const [profile, setProfile] = useState(null);
  const [relationship, setRelationship] = useState(null);
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [working, setWorking] = useState(false);
  const [activeTab, setActiveTab] = useState("posts");
  const [openCommentsFor, setOpenCommentsFor] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentDraft, setCommentDraft] = useState("");
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingCommentContent, setEditingCommentContent] = useState("");
  const [isUpdatingComment, setIsUpdatingComment] = useState(false);
  const [reportTarget, setReportTarget] = useState(null);
  const [commentToast, setCommentToast] = useState("");
  const [postActionError, setPostActionError] = useState("");
  const [sharingPostId, setSharingPostId] = useState(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileDraft, setProfileDraft] = useState({ username: "", bio: "" });
  const [totalPosts, setTotalPosts] = useState(0);

  const loadPosts = useCallback(async (nextPage, append = false) => {
    const token = localStorage.getItem("token");
    const response = await fetch(`${API}/post?authorId=${encodeURIComponent(id)}&page=${nextPage}&limit=10`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Không thể tải bài viết.");
    setPosts((current) => append ? [...current, ...data.posts] : data.posts);
    setHasMore(nextPage < (data.pagination?.pages || 0));
    setTotalPosts(data.pagination?.total || 0);
  }, [id]);

  useEffect(() => {
    const controller = new AbortController();
    async function loadProfile() {
      setLoading(true);
      setError("");
      setPosts([]);
      setPage(1);
      try {
        const token = localStorage.getItem("token");
        const [profileResponse, postsResponse] = await Promise.all([
          fetch(`${API}/user/${encodeURIComponent(id)}`, {
            headers: { Authorization: `Bearer ${token}` }, signal: controller.signal,
          }),
          fetch(`${API}/post?authorId=${encodeURIComponent(id)}&page=1&limit=10`, {
            headers: { Authorization: `Bearer ${token}` }, signal: controller.signal,
          }),
        ]);
        const [profileData, postsData] = await Promise.all([profileResponse.json(), postsResponse.json()]);
        if (!profileResponse.ok) throw new Error(profileData.message || "Không thể tải trang cá nhân.");
        if (!postsResponse.ok) throw new Error(postsData.message || "Không thể tải bài viết.");
        setProfile(profileData.user);
        setRelationship(profileData.relationship);
        setPosts(postsData.posts || []);
        setHasMore(1 < (postsData.pagination?.pages || 0));
        setTotalPosts(postsData.pagination?.total || 0);
      } catch (requestError) {
        if (requestError.name !== "AbortError") setError(requestError.message);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    loadProfile();
    return () => controller.abort();
  }, [id]);

  async function runAction(path, method, success) {
    setWorking(true);
    setActionError("");
    try {
      const response = await fetch(`${API}${path}`, {
        method,
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Thao tác không thành công.");
      await success(data);
    } catch (requestError) {
      setActionError(requestError.message);
    } finally {
      setWorking(false);
    }
  }

  async function handleFriendAction() {
    if (relationship.isFriend) {
      await runAction(`/friend/${id}`, "DELETE", () => setRelationship((current) => ({ ...current, isFriend: false })));
    } else if (relationship.hasReceivedRequest) {
      await runAction(`/friend/request/${relationship.incomingRequestId}/accept`, "PUT", () => setRelationship((current) => ({ ...current, isFriend: true, hasReceivedRequest: false })));
    } else if (!relationship.hasSentRequest) {
      await runAction(`/friend/request/${id}`, "POST", () => setRelationship((current) => ({ ...current, hasSentRequest: true })));
    }
  }

  async function handleMessage() {
    setWorking(true);
    setActionError("");
    try {
      const response = await fetch(`${API}/message/conversation/${id}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Không thể mở cuộc trò chuyện.");
      navigate("/messages", { state: { openConversationId: data.conversation._id } });
    } catch (requestError) {
      setActionError(requestError.message);
    } finally {
      setWorking(false);
    }
  }

  async function handleLoadMore() {
    const nextPage = page + 1;
    setLoadingMore(true);
    try {
      await loadPosts(nextPage, true);
      setPage(nextPage);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoadingMore(false);
    }
  }

  async function handleLike(post) {
    setPostActionError("");
    try {
      const liked = Boolean(post.isLiked);
      const response = await fetch(`${API}/post/${post._id}/like`, {
        method: liked ? "DELETE" : "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Không thể cập nhật lượt thích.");
      setPosts((current) => current.map((item) => item._id === post._id
        ? { ...item, isLiked: !liked, likes: data.likes }
        : item));
    } catch (requestError) {
      setPostActionError(requestError.message);
    }
  }

  async function handleToggleComments(postId) {
    if (openCommentsFor === postId) {
      setOpenCommentsFor(null);
      return;
    }
    setOpenCommentsFor(postId);
    setPostActionError("");
    try {
      const response = await fetch(`${API}/comment/${postId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Không thể tải bình luận.");
      setComments(data.comment || []);
    } catch (requestError) {
      setPostActionError(requestError.message);
    }
  }

  async function handleCommentSubmit(event, postId) {
    event.preventDefault();
    const content = commentDraft.trim();
    if (!content) return;
    setPostActionError("");
    try {
      const response = await fetch(`${API}/comment/${postId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ content }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Không thể gửi bình luận.");
      setComments((current) => [...current, {
        ...data.comment,
        authorId: { _id: currentUser?._id, username: "Bạn" },
        isMine: true,
      }]);
      setCommentDraft("");
    } catch (requestError) {
      setPostActionError(requestError.message);
    }
  }

  async function handleDeleteComment(commentId) {
    const confirmed = await confirmAction({
      title: "Xóa bình luận",
      message: "Bạn có chắc muốn xóa bình luận này?",
      confirmLabel: "Xóa bình luận",
      danger: true,
    });
    if (!confirmed) return;

    setPostActionError("");
    try {
      const response = await fetch(`${API}/comment/${commentId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Không thể xóa bình luận.");
      setComments((current) => current.filter((comment) => comment._id !== commentId));
    } catch (requestError) {
      setPostActionError(requestError.message);
    }
  }

  async function handleUpdateComment(event, commentId) {
    event.preventDefault();
    const content = editingCommentContent.trim();
    if (!content) {
      setPostActionError("Nội dung bình luận không được để trống.");
      return;
    }
    setIsUpdatingComment(true);
    setPostActionError("");
    try {
      const response = await fetch(`${API}/comment/${commentId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ content }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Không thể sửa bình luận.");
      setComments((current) => current.map((comment) => comment._id === commentId
        ? { ...comment, content: data.comment.content }
        : comment));
      setEditingCommentId(null);
      setEditingCommentContent("");
    } catch (requestError) {
      setPostActionError(requestError.message);
    } finally {
      setIsUpdatingComment(false);
    }
  }

  function handleReportComment(commentId) {
    setReportTarget({ targetType: "comment", targetId: commentId });
  }

  async function submitCommentReport({ reason, description }) {
    const response = await fetch(`${API}/report`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify({
        targetType: reportTarget.targetType,
        targetId: reportTarget.targetId,
        reason,
        description,
      }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Không thể gửi báo cáo.");
    setCommentToast(data.message);
  }

  async function handleShare(postId) {
    setSharingPostId(postId);
    setPostActionError("");
    try {
      const response = await fetch(`${API}/post/${postId}/share`, {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Không thể chia sẻ bài viết.");
      setPostActionError("Đã chia sẻ bài viết.");
    } catch (requestError) {
      setPostActionError(requestError.message);
    } finally {
      setSharingPostId(null);
    }
  }

  async function handleProfileSave(event) {
    event.preventDefault();
    setWorking(true);
    setActionError("");
    try {
      const response = await fetch(`${API}/user/me`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          username: profileDraft.username.trim(),
          bio: profileDraft.bio.trim(),
          profilePicture: profile.profilePicture || "",
          coverPicture: profile.coverPicture || "",
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Không thể cập nhật trang cá nhân.");
      setProfile((current) => ({ ...current, ...data.user, _id: current._id }));
      setIsEditingProfile(false);
    } catch (requestError) {
      setActionError(requestError.message);
    } finally {
      setWorking(false);
    }
  }

  if (loading) return <ProfileRoot className={`public-profile-page ${embedded ? "public-profile-embedded" : ""}`}><p>Đang tải trang cá nhân...</p></ProfileRoot>;
  if (error || !profile) return <ProfileRoot className={`public-profile-page ${embedded ? "public-profile-embedded" : ""}`}>{!embedded && <Link className="profile-back-link" to="/feed">← Quay lại bảng tin</Link>}<p className="feedback-message error">{error || "Không tìm thấy người dùng."}</p></ProfileRoot>;

  const friendCount = profile.friendCount ?? profile.friends?.length;
  const postCount = profile.postCount ?? totalPosts;
  const featuredImages = posts
    .map((post) => post.originalPostId || post)
    .filter((post) => post.image)
    .slice(0, 9);
  const friendButtonLabel = relationship?.isFriend
    ? "Bạn bè"
    : relationship?.hasSentRequest ? "Hủy lời mời" : "Thêm bạn bè";

  return (
    <ProfileRoot className={`public-profile-page ${embedded ? "public-profile-embedded" : ""}`}>
      {!embedded && <header className="public-profile-topbar">
        <Link className="profile-brand" to="/feed"><span>R</span> Ridge</Link>
        <Link className="profile-back-link" to="/feed">← Quay lại bảng tin</Link>
      </header>}

      <section className="public-profile-shell">
        <div className={`public-profile-cover ${profile.coverPicture ? "has-cover" : ""}`}>
          {profile.coverPicture && <img src={profile.coverPicture} alt="Ảnh bìa" />}
        </div>
        <div className="public-profile-summary">
          <div className="public-profile-avatar">
            {profile.profilePicture ? <img src={profile.profilePicture} alt={`Ảnh đại diện của ${profile.username}`} /> : profile.username?.charAt(0).toUpperCase()}
          </div>
          <div className="public-profile-identity">
            <h1>{profile.username}</h1>
            {profile.bio ? <p>{profile.bio}</p> : <p className="profile-empty-bio">Chưa có giới thiệu</p>}
            <div className="profile-counts">
              {friendCount !== undefined && <span><strong>{friendCount}</strong> bạn bè</span>}
              <span><strong>{postCount}</strong> bài viết</span>
            </div>
          </div>
          <div className="public-profile-actions">
            {relationship?.isSelf ? (
              <button type="button" onClick={() => { setProfileDraft({ username: profile.username || "", bio: profile.bio || "" }); setIsEditingProfile(true); }}>Chỉnh sửa trang cá nhân</button>
            ) : relationship?.hasReceivedRequest ? (
              <button type="button" disabled={working} onClick={handleFriendAction}>{working ? "Đang xử lý..." : "Chấp nhận lời mời"}</button>
            ) : relationship?.isFriend ? (
              <details className="profile-friend-menu">
                <summary><span aria-hidden="true">✓</span> Bạn bè <span aria-hidden="true">⌄</span></summary>
                <button type="button" disabled={working} onClick={handleFriendAction}>Hủy kết bạn</button>
              </details>
            ) : (
              <button type="button" disabled={working} onClick={handleFriendAction}>{working ? "Đang xử lý..." : friendButtonLabel}</button>
            )}
            {!relationship?.isSelf && <button className="profile-message-button" type="button" disabled={working || !relationship?.isFriend} onClick={handleMessage}>Nhắn tin</button>}
          </div>
        </div>
        {actionError && <p className="feedback-message error profile-action-error">{actionError}</p>}
        <nav className="profile-tabs" aria-label="Điều hướng trang cá nhân">
          <button className={activeTab === "posts" ? "active" : ""} type="button" onClick={() => setActiveTab("posts")}>Bài viết</button>
          <button className={activeTab === "about" ? "active" : ""} type="button" onClick={() => setActiveTab("about")}>Giới thiệu</button>
          <button className={activeTab === "friends" ? "active" : ""} type="button" onClick={() => setActiveTab("friends")}>Bạn bè</button>
        </nav>
      </section>

      {isEditingProfile && <div className="profile-edit-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setIsEditingProfile(false); }}>
        <section className="profile-edit-dialog" role="dialog" aria-modal="true" aria-labelledby="profile-edit-title">
          <h2 id="profile-edit-title">Chỉnh sửa trang cá nhân</h2>
          <form onSubmit={handleProfileSave}>
            <label>Tên hiển thị<input value={profileDraft.username} onChange={(event) => setProfileDraft((current) => ({ ...current, username: event.target.value }))} required maxLength="80" /></label>
            <label>Giới thiệu<textarea value={profileDraft.bio} onChange={(event) => setProfileDraft((current) => ({ ...current, bio: event.target.value }))} maxLength="255" rows="4" /></label>
            {actionError && <p className="feedback-message error">{actionError}</p>}
            <div><button type="button" className="profile-edit-cancel" onClick={() => setIsEditingProfile(false)}>Hủy</button><button type="submit" disabled={working}>{working ? "Đang lưu..." : "Lưu thay đổi"}</button></div>
          </form>
        </section>
      </div>}

      {activeTab === "about" ? (
        <section className="profile-tab-panel profile-about-panel">
          <h2>Giới thiệu</h2>
          <p>{profile.bio || "Chưa có giới thiệu."}</p>
        </section>
      ) : activeTab === "friends" ? (
        <section className="profile-tab-panel profile-about-panel">
          <h2>Bạn bè</h2>
          {profile.friends?.length ? <div className="profile-friend-grid">
            {profile.friends.map((friend) => <Link className="profile-friend-card" to={`/profile/${friend._id}`} key={friend._id}>
              <span className="profile-friend-photo">{friend.profilePicture ? <img src={friend.profilePicture} alt="" /> : friend.username?.charAt(0).toUpperCase()}</span>
              <strong>{friend.username}</strong>
            </Link>)}
          </div> : <p>Chưa có bạn bè</p>}
        </section>
      ) : (
        <section className="profile-content-grid">
          <aside className="profile-left-column">
            <section className="profile-info-card">
              <h2>Giới thiệu</h2>
              <p>{profile.bio || <span className="profile-empty-bio">Chưa có giới thiệu</span>}</p>
            </section>
            <section className="profile-info-card profile-featured-card">
              <h2>Ảnh</h2>
              {featuredImages.length > 0 ? (
                <div className="profile-featured-photos">
                  {featuredImages.map((post, index) => <img src={post.image} alt={`Ảnh trong bài viết ${index + 1}`} key={`${post._id || post.image}-${index}`} loading="lazy" />)}
                </div>
              ) : <p className="profile-empty-bio">Chưa có ảnh.</p>}
            </section>
            <section className="profile-info-card">
              <h2>Bạn bè {friendCount !== undefined && <span>{friendCount}</span>}</h2>
              {profile.friends?.length ? <div className="profile-friend-grid profile-friend-grid-compact">
                {profile.friends.slice(0, 9).map((friend) => <Link className="profile-friend-card" to={`/profile/${friend._id}`} key={friend._id}>
                  <span className="profile-friend-photo">{friend.profilePicture ? <img src={friend.profilePicture} alt="" /> : friend.username?.charAt(0).toUpperCase()}</span>
                  <strong>{friend.username}</strong>
                </Link>)}
              </div> : <p className="profile-empty-bio">Chưa có bạn bè</p>}
            </section>
          </aside>

          <section className="public-profile-posts">
            {postActionError && <p className="feedback-message error">{postActionError}</p>}
            {posts.length === 0 ? <div className="profile-empty-posts">Chưa có bài viết nào được chia sẻ.<br /><small>Các bài đăng riêng tư hoặc không thể xem sẽ không hiện ở đây.</small></div> : (
              <div className="profile-post-list">
                {posts.map((post) => {
                  const visiblePost = post.originalPostId || post;
                  const hasLiked = Boolean(post.isLiked);
                  return <article className="post-card card profile-post-card" key={post._id}>
                    <header className="post-header">
                      <div className="post-author">
                        <span className="post-avatar">{profile.profilePicture ? <img src={profile.profilePicture} alt="" /> : profile.username.charAt(0).toUpperCase()}</span>
                        <div className="post-author-info"><strong>{profile.username}</strong><span className="post-meta">Ridge · {post.createdAt ? new Date(post.createdAt).toLocaleString("vi-VN") : ""}</span></div>
                      </div>
                    </header>
                    {visiblePost.content && <p className={visiblePost.image || visiblePost.video ? "post-caption" : "post-text"}>{visiblePost.content}</p>}
                    {visiblePost.image && <img className="post-image" src={visiblePost.image} alt={`Bài viết của ${profile.username}`} loading="lazy" />}
                    {visiblePost.video && <video className="post-video" src={visiblePost.video} controls preload="metadata" />}
                    <p className="post-likes">{post.likes?.length || 0} lượt thích</p>
                    <div className="post-actions profile-post-actions">
                      <div className="post-action-group">
                        <button className={`post-action-button ${hasLiked ? "liked" : ""}`} type="button" aria-pressed={hasLiked} onClick={() => handleLike(post)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.5s-8-4.9-8-11A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 8 2.5c0 6.1-8 11-8 11z" /></svg><span>{hasLiked ? "Đã thích" : "Thích"}</span></button>
                        <button className="post-action-button" type="button" onClick={() => handleToggleComments(post._id)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 15a3 3 0 0 1-3 3H9l-5 4V6a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3z" /></svg><span>Bình luận</span></button>
                        <button className="post-action-button" type="button" disabled={sharingPostId === post._id} onClick={() => handleShare(post._id)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M22 3 11 14M22 3l-7 18-4-7-7-4z" /></svg><span>{sharingPostId === post._id ? "Đang chia sẻ" : "Chia sẻ"}</span></button>
                      </div>
                    </div>
                    {openCommentsFor === post._id && <div className="profile-comments ridge-comments-list">
                      {comments.map((comment) => <CommentItem
                        key={comment._id}
                        comment={comment}
                        currentUserId={currentUser?._id}
                        postOwnerId={post.authorId?._id || profile._id}
                        isAdmin={currentUser?.isAdmin}
                        isEditing={editingCommentId === comment._id}
                        editingContent={editingCommentContent}
                        isUpdating={isUpdatingComment}
                        onEdit={(item) => { setEditingCommentId(item._id); setEditingCommentContent(item.content); }}
                        onEditingChange={setEditingCommentContent}
                        onCancelEdit={() => { setEditingCommentId(null); setEditingCommentContent(""); }}
                        onUpdate={handleUpdateComment}
                        onDelete={() => handleDeleteComment(comment._id)}
                        onReport={() => handleReportComment(comment._id)}
                      />)}
                      <form className="profile-comment-form" onSubmit={(event) => handleCommentSubmit(event, post._id)}><input aria-label="Viết bình luận" placeholder="Viết bình luận..." value={commentDraft} onChange={(event) => setCommentDraft(event.target.value)} maxLength="500" /><button type="submit" disabled={!commentDraft.trim()}>Gửi</button></form>
                    </div>}
                  </article>;
                })}
              </div>
            )}
            {hasMore && <button className="profile-load-more" type="button" disabled={loadingMore} onClick={handleLoadMore}>{loadingMore ? "Đang tải..." : "Xem thêm bài viết"}</button>}
            {error && <p className="feedback-message error">{error}</p>}
          </section>
        </section>
      )}
      <ReportDialog
        key={reportTarget?.targetId || "closed"}
        open={Boolean(reportTarget)}
        targetType={reportTarget?.targetType}
        onClose={() => setReportTarget(null)}
        onSubmit={submitCommentReport}
      />
      <Toast message={commentToast} onDismiss={() => setCommentToast("")} />
    </ProfileRoot>
  );
}

export default ProfilePage;
