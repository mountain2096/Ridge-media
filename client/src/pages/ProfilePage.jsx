import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useOutletContext, useParams } from "react-router-dom";
import { API_BASE } from "../lib/api.js";
import { useConfirm, useModalBehavior } from "../components/ConfirmDialog.jsx";
import ReportDialog from "../components/ReportDialog.jsx";
import Toast from "../components/Toast.jsx";
import PostCard from "../components/PostCard.jsx";
import MediaPicker from "../components/MediaPicker.jsx";
import { uploadMedia } from "../lib/uploadMedia.js";
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
  const [avatarFile, setAvatarFile] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [coverPreview, setCoverPreview] = useState("");
  const profileEditDialogRef = useRef(null);
  const profileEditCancelRef = useRef(null);
  const [totalPosts, setTotalPosts] = useState(0);
  const [editingPostId, setEditingPostId] = useState(null);
  const [editingPostContent, setEditingPostContent] = useState("");
  const [isSavingPost, setIsSavingPost] = useState(false);
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [bioDraft, setBioDraft] = useState("");
  const [bioError, setBioError] = useState("");
  const [isSavingBio, setIsSavingBio] = useState(false);
  const [aboutMenuOpen, setAboutMenuOpen] = useState(false);
  const [friendSearch, setFriendSearch] = useState("");

  useModalBehavior(isEditingProfile, working, () => setIsEditingProfile(false), profileEditCancelRef, profileEditDialogRef);

  useEffect(() => () => {
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
  }, [avatarPreview]);

  useEffect(() => () => {
    if (coverPreview) URL.revokeObjectURL(coverPreview);
  }, [coverPreview]);

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
      setPosts((current) => current.map((post) => post._id === postId
        ? { ...post, commentsCount: (post.commentsCount || 0) + 1 }
        : post));
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

  async function handleDeleteComment(commentId, postId) {
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
      setPosts((current) => current.map((post) => post._id === postId
        ? { ...post, commentsCount: Math.max(0, (post.commentsCount || 0) - 1) }
        : post));
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
      const [uploadedAvatar, uploadedCover] = await Promise.all([
        avatarFile ? uploadMedia(avatarFile) : null,
        coverFile ? uploadMedia(coverFile) : null,
      ]);
      const response = await fetch(`${API}/user/me`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          username: profileDraft.username.trim(),
          bio: profileDraft.bio.trim(),
          profilePicture: uploadedAvatar?.url || profile.profilePicture || "",
          coverPicture: uploadedCover?.url || profile.coverPicture || "",
          dateOfBirth: profile.dateOfBirth || null,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Không thể cập nhật trang cá nhân.");
      setProfile((current) => ({ ...current, ...data.user, _id: current._id }));
      setAvatarFile(null);
      setCoverFile(null);
      setAvatarPreview("");
      setCoverPreview("");
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
              <button type="button" onClick={() => { setProfileDraft({ username: profile.username || "", bio: profile.bio || "" }); setAvatarFile(null); setCoverFile(null); setAvatarPreview(""); setCoverPreview(""); setActionError(""); setIsEditingProfile(true); }}>Chỉnh sửa trang cá nhân</button>
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
        {!isEditingProfile && actionError && <p className="feedback-message error profile-action-error" role="alert">{actionError}</p>}
        <nav className="profile-tabs" aria-label="Điều hướng trang cá nhân">
          <button className={activeTab === "posts" ? "active" : ""} type="button" onClick={() => setActiveTab("posts")}>Bài viết</button>
          <button className={activeTab === "about" ? "active" : ""} type="button" onClick={() => setActiveTab("about")}>Giới thiệu</button>
          <button className={activeTab === "friends" ? "active" : ""} type="button" onClick={() => setActiveTab("friends")}>Bạn bè</button>
        </nav>
      </section>

      {isEditingProfile && <div className="ridge-dialog-backdrop profile-edit-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !working) setIsEditingProfile(false); }}>
        <section className="ridge-dialog profile-edit-dialog" role="dialog" aria-modal="true" aria-labelledby="profile-edit-title" ref={profileEditDialogRef} tabIndex={-1}>
          <h2 id="profile-edit-title">Chỉnh sửa trang cá nhân</h2>
          <form onSubmit={handleProfileSave}>
            <label>Tên hiển thị<input value={profileDraft.username} onChange={(event) => setProfileDraft((current) => ({ ...current, username: event.target.value }))} required minLength="2" maxLength="40" /></label>
            <label>Giới thiệu<textarea value={profileDraft.bio} onChange={(event) => setProfileDraft((current) => ({ ...current, bio: event.target.value }))} maxLength="255" rows="4" /></label>
            <span className="profile-edit-counter">{profileDraft.bio.length}/255 ký tự</span>
            <div className="profile-edit-image-fields">
              <MediaPicker label="Ảnh đại diện" kind="avatar" file={avatarFile} previewUrl={avatarPreview} currentUrl={profile.profilePicture} onFileChange={(file) => { setAvatarFile(file); setAvatarPreview(file ? URL.createObjectURL(file) : ""); }} onRemove={() => { setAvatarFile(null); setAvatarPreview(""); }} />
              <MediaPicker label="Ảnh bìa" kind="cover" file={coverFile} previewUrl={coverPreview} currentUrl={profile.coverPicture} onFileChange={(file) => { setCoverFile(file); setCoverPreview(file ? URL.createObjectURL(file) : ""); }} onRemove={() => { setCoverFile(null); setCoverPreview(""); }} />
            </div>
            {actionError && <p className="feedback-message error" role="alert">{actionError}</p>}
            <div className="ridge-dialog-actions"><button ref={profileEditCancelRef} type="button" className="ridge-dialog-button is-secondary" onClick={() => setIsEditingProfile(false)}>Hủy</button><button className="ridge-dialog-button is-primary" type="submit" disabled={working}>{working ? "Đang lưu..." : "Lưu thay đổi"}</button></div>
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
              <header className="profile-panel-heading"><h2>Ảnh</h2></header>
              {featuredImages.length > 0 ? (
                <div className="profile-featured-photos">
                  {featuredImages.map((post, index) => <img src={post.image} alt={`Ảnh trong bài viết ${index + 1}`} key={`${post._id || post.image}-${index}`} loading="lazy" />)}
                </div>
              ) : <p className="profile-empty-bio">Chưa có ảnh.</p>}
            </section>
            <section className="profile-info-card">
              <header className="profile-panel-heading"><h2>Bạn bè {friendCount !== undefined && <span className="profile-card-count">· {friendCount}</span>}</h2>{profile.friends?.length > 9 && <button className="profile-view-more" type="button" onClick={() => setActiveTab("friends")}>Xem thêm</button>}</header>
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
                {posts.map((post) => <PostCard
  key={post._id}
  post={post}
  currentUser={currentUser}
  isLiked={Boolean(post.isLiked)}
  commentsCount={post.commentsCount ?? 0}
  editingPostId={editingPostId}
  editingPostContent={editingPostContent}
  isSavingPost={isSavingPost}
  isSharing={sharingPostId === post._id}
  postActionError={postActionError}
  commentsOpen={openCommentsFor === post._id}
  comments={comments}
  commentContent={commentDraft}
  editingCommentId={editingCommentId}
  editingCommentContent={editingCommentContent}
  isUpdatingComment={isUpdatingComment}
  onLike={handleLike}
  onToggleComments={(item) => handleToggleComments(item._id)}
  onShare={(item) => handleShare(item._id)}
  onToggleSaved={(item, saved) => handleToggleSavedPost(item._id, saved)}
  onStartEdit={(item) => { setEditingPostId(item._id); setEditingPostContent(item.content || ''); }}
  onEditingPostContentChange={setEditingPostContent}
  onUpdatePost={(event, item) => handleUpdatePost(event, item._id)}
  onCancelEditPost={() => { setEditingPostId(null); setEditingPostContent(''); setPostActionError(''); }}
  onDeletePost={(item) => handleDeletePost(item._id)}
  onReportPost={(item) => handleReportPost(item._id)}
  onCommentChange={setCommentDraft}
  onCreateComment={(event, item) => handleCommentSubmit(event, item._id)}
  onCommentEdit={(item) => { setEditingCommentId(item._id); setEditingCommentContent(item.content); }}
  onCommentEditingChange={setEditingCommentContent}
  onCancelCommentEdit={() => { setEditingCommentId(null); setEditingCommentContent(''); }}
  onUpdateComment={handleUpdateComment}
  onDeleteComment={(item) => handleDeleteComment(item._id, post._id)}
  onReportComment={(item) => handleReportComment(item._id)}
/>)}
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
