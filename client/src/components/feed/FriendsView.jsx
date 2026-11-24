import { resolveMediaUrl } from "../../lib/api.js";
import { Link } from "react-router-dom";
import FriendPresence from "./FriendPresence.jsx";

export default function FriendsView({ friends, navigate }) {
  return (
    <section className="friends-page">
      <h1 className="section-title">Danh sách bạn bè</h1>
      {friends.length === 0 ? <p>Bạn chưa có bạn bè nào.</p> : (
        <div className="friends-page-list">
          {friends.map((friend) => (
            <div className="friend-row" key={friend._id}>
              <Link className="friend-avatar" to={`/profile/${friend._id}`} aria-label={`Xem trang cá nhân ${friend.username}`}>
                {friend.profilePicture ? <img src={resolveMediaUrl(friend.profilePicture)} alt="" /> : (friend.username?.charAt(0).toUpperCase() || "?")}
              </Link>
              <Link className="friend-name profile-name-link" to={`/profile/${friend._id}`}>{friend.username}</Link>
              <FriendPresence friend={friend} />
              <button className="btn-outline" type="button" onClick={() => navigate("/messages", { state: { openUserId: friend._id } })}>Nhắn tin</button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
