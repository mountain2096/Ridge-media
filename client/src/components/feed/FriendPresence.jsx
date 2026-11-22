export default function FriendPresence({ friend }) {
  const label = friend.isOnline ? "Đang hoạt động" : "Không hoạt động";
  return (
    <span className="friend-presence" title={label}>
      <span className={`friend-presence-dot ${friend.isOnline ? "is-online" : "is-offline"}`} aria-hidden="true" />
      <span className="friend-presence-sr-only">{label}</span>
    </span>
  );
}
