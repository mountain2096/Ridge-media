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
  const [openPostMenuId, setOpenPostMenuId] = useState(null);
  const [editingPostId, setEditingPostId] = useState(null);
  const [editingPostContent, setEditingPostContent] = useState("");
  const [isSavingPost, setIsSavingPost] = useState(false);
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [bioDraft, setBioDraft] = useState("");
  const [bioError, setBioError] = useState("");
  const [isSavingBio, setIsSavingBio] = useState(false);
  const [aboutMenuOpen, setAboutMenuOpen] = useState(false);
  const [friendSearch, setFriendSearch] = useState("");

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
      const confirmed = await confirmAction({
        title: "Hủy kết bạn",
        message: `Bạn có chắc muốn hủy kết bạn với ${profile.username}?`,
        confirmLabel: "Hủy kết bạn",
        danger: true,
      });
      if (!confirmed) return;
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

  async function handleDeletePost(postId) {
    if (!(await confirmAction({
      title: "Xóa bài viết",
      message: "Bạn có chắc muốn xóa bài viết này?",
      confirmLabel: "Xóa bài viết",
      danger: true,
    }))) return;

    setPostActionError("");
    try {
      const response = await fetch(`${API}/post/${postId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Không thể xóa bài viết.");
      setPosts((current) => current.filter((post) => post._id !== postId));
      setTotalPosts((count) => Math.max(0, count - 1));
      setProfile((current) => current?.postCount == null ? current : { ...current, postCount: Math.max(0, current.postCount - 1) });
      setOpenPostMenuId(null);
      if (openCommentsFor === postId) {
        setOpenCommentsFor(null);
        setComments([]);
      }
    } catch (requestError) {
      setPostActionError(requestError.message);
    }
  }

  async function handleUpdatePost(event, postId) {
    event.preventDefault();
    const content = editingPostContent.trim();
    if (!content) {
      setPostActionError("Nội dung bài viết không được để trống.");
      return;
    }
    setIsSavingPost(true);
    setPostActionError("");
    try {
      const response = await fetch(`${API}/post/${postId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ content }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Không thể cập nhật bài viết.");
      setPosts((current) => current.map((post) => post._id === postId
        ? { ...post, content: data.post.content }
        : post));
      setEditingPostId(null);
      setEditingPostContent("");
    } catch (requestError) {
      setPostActionError(requestError.message);
    } finally {
      setIsSavingPost(false);
    }
  }

  async function handleToggleSavedPost(postId, isSaved) {
    setPostActionError("");
    try {
      const response = await fetch(`${API}/post/${postId}/save`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ isSaved: !isSaved }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Không thể cập nhật bài viết đã lưu.");
      setPosts((current) => current.map((post) => post._id === postId
        ? { ...post, isSaved: data.isSaved }
        : post));
    } catch (requestError) {
      setPostActionError(requestError.message);
    }
  }

  function handleReportPost(postId) {
    setReportTarget({ targetType: "post", targetId: postId });
  }

  async function handleBioSave(event) {
    event.preventDefault();
    setIsSavingBio(true);
    setBioError("");
    try {
      const response = await fetch(`${API}/user/me`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ bio: bioDraft.trim() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Không thể cập nhật giới thiệu.");
      setProfile((current) => ({ ...current, ...data.user, _id: current._id }));
      setIsEditingBio(false);
    } catch (requestError) {
      setBioError(requestError.message);
    } finally {
      setIsSavingBio(false);
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
  const normalizedFriendSearch = friendSearch.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLocaleLowerCase("vi");
  const filteredFriends = (profile.friends || []).filter((friend) => friend.username
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLocaleLowerCase("vi")
    .includes(normalizedFriendSearch));
  const bioContent = isEditingBio ? (
    <form className="profile-bio-edit" onSubmit={handleBioSave}>
      <label className="profile-visually-hidden" htmlFor="profile-bio-draft">Giới thiệu</label>
      <textarea id="profile-bio-draft" value={bioDraft} maxLength={255} rows={4} onChange={(event) => setBioDraft(event.target.value)} />
      <div className="profile-bio-edit-footer"><span>{bioDraft.length}/255</span><div>
        <button type="button" className="profile-bio-cancel" onClick={() => { setIsEditingBio(false); setBioError(""); }}>Hủy</button>
        <button type="submit" disabled={isSavingBio}>{isSavingBio ? "Đang lưu..." : "Lưu"}</button>
      </div></div>
      {bioError && <p className="feedback-message error" role="alert">{bioError}</p>}
    </form>
  ) : <p>{profile.bio || <span className="profile-empty-bio">Chưa có giới thiệu</span>}</p>;
  const aboutMenu = relationship?.isSelf && (
    <div className="profile-about-menu-wrap">
      <button className="profile-about-menu-button" type="button" aria-label="Tùy chọn giới thiệu" aria-expanded={aboutMenuOpen} onClick={() => setAboutMenuOpen((open) => !open)}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="19" cy="12" r="1.8" /></svg>
      </button>
      {aboutMenuOpen && <div className="profile-about-menu" role="group">
        <button type="button" onClick={() => { setBioDraft(profile.bio || ""); setBioError(""); setIsEditingBio(true); setAboutMenuOpen(false); }}>Chỉnh sửa giới thiệu</button>
      </div>}
    </div>
  );

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
          <header className="profile-panel-heading"><h2>Giới thiệu</h2>{aboutMenu}</header>
          {bioContent}
        </section>
      ) : activeTab === "friends" ? (
        <section className="profile-tab-panel profile-about-panel">
          <h2>Bạn bè</h2>
          <label className="profile-friend-search-label" htmlFor="profile-friend-search">Tìm bạn bè</label>
          <input id="profile-friend-search" className="profile-friend-search" type="search" placeholder="Tìm bạn bè" value={friendSearch} onChange={(event) => setFriendSearch(event.target.value)} />
          {filteredFriends.length ? <div className="profile-friend-grid">
            {filteredFriends.map((friend) => <Link className="profile-friend-card" to={`/profile/${friend._id}`} key={friend._id}>
              <span className="profile-friend-photo">{friend.profilePicture ? <img src={friend.profilePicture} alt="" /> : friend.username?.charAt(0).toUpperCase()}</span>
              <strong>{friend.username}</strong>
            </Link>)}
          </div> : <p>Không tìm thấy bạn bè nào.</p>}
        </section>
      ) : (
        <section className="profile-content-grid">
          <aside className="profile-left-column">
            <section className="profile-info-card">
              <header className="profile-panel-heading"><h2>Giới thiệu</h2>{aboutMenu}</header>
              {bioContent}
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
              <header className="profile-panel-heading"><h2>Bạn bè {friendCount !== undefined && <span>{friendCount}</span>}</h2>{profile.friends?.length > 9 && <button className="profile-view-more" type="button" onClick={() => setActiveTab("friends")}>Xem thêm</button>}</header>
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
                      <div className="post-menu-wrap">
                        <button className="post-more" type="button" aria-label="Tùy chọn bài viết" aria-expanded={openPostMenuId === post._id} onClick={() => setOpenPostMenuId((openId) => openId === post._id ? null : post._id)}>
                          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="19" cy="12" r="1.8" /></svg>
                        </button>
                        {openPostMenuId === post._id && <div className="post-menu" role="group" aria-label="Tùy chọn bài viết">
                          {post.isMine ? <>
                            <button type="button" onClick={() => { setEditingPostId(post._id); setEditingPostContent(post.content || ""); setOpenPostMenuId(null); }}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 5 4 4M4 20l4.5-1 10-10a2.1 2.1 0 0 0-3-3l-10 10L4 20z" /></svg>Chỉnh sửa bài viết</button>
                            <button className="post-menu-delete" type="button" onClick={() => handleDeletePost(post._id)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M5 7l1 14h12l1-14M9 7V4h6v3" /></svg>Xóa bài viết</button>
                          </> : <>
                            <button type="button" onClick={() => { void handleToggleSavedPost(post._id, Boolean(post.isSaved)); setOpenPostMenuId(null); }}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4.5L5 21V4a1 1 0 0 1 1-1z" /></svg>{post.isSaved ? "Bỏ lưu bài viết" : "Lưu bài viết"}</button>
                            <button className="danger" type="button" onClick={() => { setOpenPostMenuId(null); handleReportPost(post._id); }}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 21V4m0 0h11l-2 4 2 4H5" /></svg>Báo cáo bài viết</button>
                          </>}
                        </div>}
                      </div>
                    </header>
                    {editingPostId === post._id ? <form className="post-edit-form" onSubmit={(event) => handleUpdatePost(event, post._id)}>
                      <textarea value={editingPostContent} onChange={(event) => setEditingPostContent(event.target.value)} maxLength="500" aria-label="Chỉnh sửa nội dung bài viết" />
                      <div><button type="submit" disabled={isSavingPost}>{isSavingPost ? "Đang lưu..." : "Lưu"}</button><button type="button" onClick={() => { setEditingPostId(null); setEditingPostContent(""); setPostActionError(""); }}>Hủy</button></div>
                    </form> : visiblePost.content && <p className={visiblePost.image || visiblePost.video ? "post-caption" : "post-text"}>{visiblePost.content}</p>}
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
