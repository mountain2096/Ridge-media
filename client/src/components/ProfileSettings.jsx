import { useEffect, useState } from "react";
import { uploadMedia } from "../lib/uploadMedia.js";

function ProfileSettings({ currentUser, onProfileSaved }) {
  const [username, setUsername] = useState(currentUser?.username || "");
  const [bio, setBio] = useState(currentUser?.bio || "");
  const [profilePicture, setProfilePicture] = useState(currentUser?.profilePicture || "");
  const [coverPicture, setCoverPicture] = useState(currentUser?.coverPicture || "");
  const [dateOfBirth, setDateOfBirth] = useState(currentUser?.dateOfBirth ? currentUser.dateOfBirth.slice(0, 10) : "");
  const [profilePictureFile, setProfilePictureFile] = useState(null);
  const [coverPictureFile, setCoverPictureFile] = useState(null);
  const [profilePreviewUrl, setProfilePreviewUrl] = useState("");
  const [coverPreviewUrl, setCoverPreviewUrl] = useState("");
  const [feedback, setFeedback] = useState({ type: "", text: "" });
  const [isSaving, setIsSaving] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [blockError, setBlockError] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordFeedback, setPasswordFeedback] = useState({ type: "", text: "" });
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  useEffect(() => () => {
    if (profilePreviewUrl) URL.revokeObjectURL(profilePreviewUrl);
  }, [profilePreviewUrl]);

  useEffect(() => () => {
    if (coverPreviewUrl) URL.revokeObjectURL(coverPreviewUrl);
  }, [coverPreviewUrl]);

  useEffect(() => {
    const controller = new AbortController();
    async function loadBlockedUsers() {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch("http://localhost:5000/api/user/blocked", {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || "Không thể tải danh sách đã chặn.");
        }
        setBlockedUsers(data.blockedUsers);
      } catch (requestError) {
        if (requestError.name !== "AbortError") setBlockError(requestError.message);
      }
    }

    loadBlockedUsers();
    return () => controller.abort();
  }, []);

  async function handleUnblock(userId) {
    setBlockError("");
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`http://localhost:5000/api/user/unblock/${userId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Không thể bỏ chặn người dùng.");
      }
      setBlockedUsers((users) => users.filter((user) => user._id !== userId));
    } catch (requestError) {
      setBlockError(requestError.message);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    setFeedback({ type: "", text: "" });
    setIsSaving(true);

    try {
      const [uploadedProfilePicture, uploadedCoverPicture] = await Promise.all([
        profilePictureFile ? uploadMedia(profilePictureFile) : null,
        coverPictureFile ? uploadMedia(coverPictureFile) : null,
      ]);
      const token = localStorage.getItem("token");
      const response = await fetch("http://localhost:5000/api/user/me", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          username: username.trim(),
          bio: bio.trim(),
          profilePicture: uploadedProfilePicture?.url || profilePicture.trim(),
          coverPicture: uploadedCoverPicture?.url || coverPicture.trim(),
          dateOfBirth: dateOfBirth || null,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Không thể cập nhật hồ sơ.");
      }

      onProfileSaved(data.user);
      setProfilePicture(data.user.profilePicture || "");
      setCoverPicture(data.user.coverPicture || "");
      setDateOfBirth(data.user.dateOfBirth ? data.user.dateOfBirth.slice(0, 10) : "");
      setProfilePictureFile(null);
      setCoverPictureFile(null);
      setProfilePreviewUrl("");
      setCoverPreviewUrl("");
      form.reset();
      setFeedback({ type: "success", text: data.message || "Đã cập nhật hồ sơ." });
    } catch (requestError) {
      setFeedback({ type: "error", text: requestError.message });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleChangePassword(event) {
    event.preventDefault();
    setPasswordFeedback({ type: "", text: "" });
    setIsChangingPassword(true);
    try {
      const response = await fetch("http://localhost:5000/api/auth/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Không thể đổi mật khẩu.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordFeedback({ type: "success", text: data.message });
    } catch (requestError) {
      setPasswordFeedback({ type: "error", text: requestError.message });
    } finally {
      setIsChangingPassword(false);
    }
  }

  return (
    <section className="settings-page" aria-label="Cài đặt">
      <section className="settings-card card">
        <header className="settings-card-header">
          <h1>Cài đặt hồ sơ</h1>
          <p>Cập nhật tên hiển thị, ngày sinh, giới thiệu và hình ảnh hồ sơ.</p>
        </header>
        <form className="settings-form" onSubmit={handleSubmit}>
          <label>
            <span>Tên người dùng</span>
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              minLength="2"
              maxLength="40"
              required
            />
          </label>
          <label>
            <span>Ngày sinh</span>
            <input
              type="date"
              value={dateOfBirth}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(event) => setDateOfBirth(event.target.value)}
            />
          </label>
          <label>
            <span>Giới thiệu</span>
            <textarea
              value={bio}
              onChange={(event) => setBio(event.target.value)}
              maxLength="255"
              rows="4"
            />
          </label>
          <div className="settings-image-row">
            <div className="settings-image-field">
              <span className="settings-label">Ảnh đại diện</span>
              <label className="settings-file-button">
                <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3" /><circle cx="9" cy="10" r="1.8" /><path d="m21 16-5-5-9 9" /></svg>
                Chọn ảnh
                <input
                  className="settings-file-input"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={(event) => {
                    const file = event.target.files?.[0] || null;
                    setProfilePictureFile(file);
                    setProfilePreviewUrl(file ? URL.createObjectURL(file) : "");
                  }}
                />
              </label>
              <span className="settings-file-name">{profilePictureFile?.name || (profilePicture ? "Ảnh hiện tại" : "Chưa chọn ảnh")}</span>
              {(profilePreviewUrl || profilePicture) && (
                <img className="settings-avatar-preview" src={profilePreviewUrl || profilePicture} alt="Xem trước ảnh đại diện" />
              )}
            </div>
            <div className="settings-image-field">
              <span className="settings-label">Ảnh bìa</span>
              <label className="settings-file-button">
                <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3" /><circle cx="9" cy="10" r="1.8" /><path d="m21 16-5-5-9 9" /></svg>
                Chọn ảnh
                <input
                  className="settings-file-input"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={(event) => {
                    const file = event.target.files?.[0] || null;
                    setCoverPictureFile(file);
                    setCoverPreviewUrl(file ? URL.createObjectURL(file) : "");
                  }}
                />
              </label>
              <span className="settings-file-name">{coverPictureFile?.name || (coverPicture ? "Ảnh hiện tại" : "Chưa chọn ảnh")}</span>
              {(coverPreviewUrl || coverPicture) && (
                <img className="settings-cover-preview" src={coverPreviewUrl || coverPicture} alt="Xem trước ảnh bìa" />
              )}
            </div>
          </div>
          {feedback.text && (
            <p className={`feedback-message ${feedback.type}`} role={feedback.type === "error" ? "alert" : "status"} aria-live={feedback.type === "error" ? "assertive" : "polite"}>{feedback.text}</p>
          )}
          <div className="settings-submit-row">
            <button className="settings-submit" type="submit" disabled={isSaving}>
              {isSaving ? "Đang lưu..." : "Lưu thay đổi"}
            </button>
          </div>
        </form>
      </section>

      <section className="settings-card card">
        <header className="settings-card-header">
          <h2>Đổi mật khẩu</h2>
          <p>Cập nhật mật khẩu để bảo vệ tài khoản của bạn.</p>
        </header>
        <form className="settings-form" onSubmit={handleChangePassword}>
          <label><span>Mật khẩu hiện tại</span><input type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required /></label>
          <label><span>Mật khẩu mới</span><input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} minLength="8" required /></label>
          <label><span>Xác nhận mật khẩu mới</span><input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} minLength="8" required /></label>
          <p className="password-requirement">Mật khẩu mới cần ít nhất 8 ký tự, gồm chữ hoa, chữ thường và số.</p>
          {passwordFeedback.text && <p className={`feedback-message ${passwordFeedback.type}`} role={passwordFeedback.type === "error" ? "alert" : "status"} aria-live={passwordFeedback.type === "error" ? "assertive" : "polite"}>{passwordFeedback.text}</p>}
          <div className="settings-submit-row">
            <button className="settings-submit" type="submit" disabled={isChangingPassword}>{isChangingPassword ? "Đang đổi..." : "Đổi mật khẩu"}</button>
          </div>
        </form>
      </section>

      <section className="settings-card card">
        <header className="settings-card-header">
          <h2>Người dùng đã chặn</h2>
          <p>Quản lý những người bạn đã chặn.</p>
        </header>
        {blockError && <p className="feedback-message error" role="alert" aria-live="assertive">{blockError}</p>}
        {blockedUsers.length === 0 && !blockError && <p className="settings-empty">Bạn chưa chặn ai.</p>}
        <div className="blocked-users-list">
          {blockedUsers.map((user) => (
            <div className="blocked-user-row" key={user._id}>
              <span className="blocked-user-avatar">
                {user.profilePicture ? <img src={user.profilePicture} alt="" /> : (user.username || "U").charAt(0).toUpperCase()}
              </span>
              <strong>{user.username}</strong>
              <button className="settings-unblock" type="button" onClick={() => handleUnblock(user._id)}>Bỏ chặn</button>
            </div>
          ))}
        </div>
      </section>
    </section>
  );
}

export default ProfileSettings;
