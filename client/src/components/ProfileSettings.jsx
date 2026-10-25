import { useEffect, useState } from "react";
import { uploadMedia } from "../lib/uploadMedia.js";

function ProfileSettings({ currentUser, onProfileSaved }) {
  const [username, setUsername] = useState(currentUser?.username || "");
  const [bio, setBio] = useState(currentUser?.bio || "");
  const [profilePicture, setProfilePicture] = useState(currentUser?.profilePicture || "");
  const [coverPicture, setCoverPicture] = useState(currentUser?.coverPicture || "");
  const [profilePictureFile, setProfilePictureFile] = useState(null);
  const [coverPictureFile, setCoverPictureFile] = useState(null);
  const [feedback, setFeedback] = useState({ type: "", text: "" });
  const [isSaving, setIsSaving] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [blockError, setBlockError] = useState("");

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
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Không thể cập nhật hồ sơ.");
      }

      onProfileSaved(data.user);
      setProfilePicture(data.user.profilePicture || "");
      setCoverPicture(data.user.coverPicture || "");
      setProfilePictureFile(null);
      setCoverPictureFile(null);
      form.reset();
      setFeedback({ type: "success", text: data.message || "Đã cập nhật hồ sơ." });
    } catch (requestError) {
      setFeedback({ type: "error", text: requestError.message });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="settings-card">
      <h1>Cài đặt hồ sơ</h1>
      <p>Cập nhật tên hiển thị, giới thiệu, ảnh đại diện và ảnh bìa.</p>
      <form className="settings-form" onSubmit={handleSubmit}>
        <label>
          Tên người dùng
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            minLength="2"
            maxLength="40"
            required
          />
        </label>
        <label>
          Giới thiệu
          <textarea
            value={bio}
            onChange={(event) => setBio(event.target.value)}
            maxLength="255"
            rows="4"
          />
        </label>
        <label>
          Tải ảnh đại diện
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={(event) => setProfilePictureFile(event.target.files?.[0] || null)}
          />
          {profilePictureFile && <span className="selected-media-name">{profilePictureFile.name}</span>}
        </label>
        <label>
          Tải ảnh bìa
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={(event) => setCoverPictureFile(event.target.files?.[0] || null)}
          />
          {coverPictureFile && <span className="selected-media-name">{coverPictureFile.name}</span>}
        </label>
        {feedback.text && (
          <p className={`feedback-message ${feedback.type}`}>{feedback.text}</p>
        )}
        <button className="create-post-button" type="submit" disabled={isSaving}>
          {isSaving ? "Đang lưu..." : "Lưu thay đổi"}
        </button>
      </form>
      <section className="blocked-users-section">
        <h2>Người dùng đã chặn</h2>
        {blockError && <p className="feedback-message error">{blockError}</p>}
        {blockedUsers.length === 0 && !blockError && <p>Bạn chưa chặn người dùng nào.</p>}
        {blockedUsers.map((user) => (
          <div className="blocked-user-row" key={user._id}>
            <strong>{user.username}</strong>
            <button type="button" onClick={() => handleUnblock(user._id)}>Bỏ chặn</button>
          </div>
        ))}
      </section>
    </section>
  );
}

export default ProfileSettings;
