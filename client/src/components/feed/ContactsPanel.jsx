import { resolveMediaUrl } from "../../lib/api.js";
import FriendPresence from "./FriendPresence.jsx";

export default function ContactsPanel({ friends, sortedContactFriends, onStartConversation }) {
  const handleStartConversation = onStartConversation;
  return (
    <aside className="right-column">
      <section className="contacts-panel">
        <h2>Người liên hệ</h2>
        {friends.length === 0 ? <p className="friends-empty">Bạn chưa có bạn bè nào.</p> : (
          <div className="contacts-list">
            {sortedContactFriends.map((friend) => (
              <button className="contact-row" type="button" key={friend._id} onClick={() => handleStartConversation(friend._id)}>
                <span className="contact-avatar">
                  {friend.profilePicture ? <img src={resolveMediaUrl(friend.profilePicture)} alt="" /> : (friend.username?.charAt(0).toUpperCase() || "?")}
                </span>
                <span>{friend.username}</span>
                <FriendPresence friend={friend} />
              </button>
            ))}
          </div>
        )}
      </section>
    </aside>
  );
}
