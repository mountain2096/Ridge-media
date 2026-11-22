export default function PostComposer({ currentUser, postContent, onPostContentChange, postPrivacy, onPostPrivacyChange, postImageFile, postVideoFile, onImageFileChange, onVideoFileChange, isPosting, postError, onSubmit }) {
  return (
    <form className="create-post-card card" onSubmit={onSubmit}>
      <h2>Tạo bài viết</h2>
      <div className="composer-row">
        <span className="composer-avatar">
          {currentUser?.profilePicture ? <img src={currentUser.profilePicture} alt="" /> : (currentUser?.username?.charAt(0).toUpperCase() || "R")}
        </span>
        <textarea
          className="create-post-input"
          aria-label="Nội dung bài viết"
          placeholder="Bạn đang nghĩ gì?"
          rows="3"
          maxLength="500"
          value={postContent}
          onChange={(event) => onPostContentChange(event.target.value)}
        />
      </div>
      <p className="upload-hint">Ảnh hoặc video tùy chọn, tối đa 30 MB mỗi tệp.</p>
      <div className="composer-actions">
        <label className="chip">
          <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3" /><circle cx="9" cy="10" r="1.8" /><path d="m21 16-5-5-9 9" /></svg>
          Ảnh
          <input
            id="post-image-input"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            aria-label="Chọn ảnh cho bài viết"
            onChange={(event) => onImageFileChange(event.target.files?.[0] || null)}
          />
        </label>
        <label className="chip">
          <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="6" width="13" height="12" rx="3" /><path d="m16 10 5-3v10l-5-3" /></svg>
          Video
          <input
            id="post-video-input"
            type="file"
            accept="video/mp4,video/webm"
            aria-label="Chọn video cho bài viết"
            onChange={(event) => onVideoFileChange(event.target.files?.[0] || null)}
          />
        </label>
        {(postImageFile || postVideoFile) && (
          <span className="selected-media-name">
            {[postImageFile?.name, postVideoFile?.name].filter(Boolean).join(" · ")}
          </span>
        )}
        <span className="composer-spacer" />
        <label className="select-label">
          Ai có thể xem?
          <select value={postPrivacy} onChange={(event) => onPostPrivacyChange(event.target.value)}>
            <option value="public">Mọi người</option>
            <option value="friends">Bạn bè</option>
            <option value="private">Chỉ mình tôi</option>
          </select>
        </label>
        <button className="create-post-button btn-primary" type="submit" disabled={isPosting}>
          {isPosting ? "Đang đăng..." : "Đăng bài"}
        </button>
      </div>

      {postError && (
        <p className="feedback-message error">{postError}</p>
      )}
    </form>
  );
}
