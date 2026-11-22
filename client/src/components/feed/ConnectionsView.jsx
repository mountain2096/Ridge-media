import { Link } from "react-router-dom";
import FriendPresence from "./FriendPresence.jsx";

export default function ConnectionsView({ friendRequests, friendRequestError, isLoadingFriendRequests, handleFriendRequestAction, friendSearch, setFriendSearch, friends, filteredFriends, handleStartConversation, handleUnfriend, searchQuery, isLoadingPeople, peopleError, people, sentRequestIds, sendingFriendRequestIds, handleSendFriendRequest, handleBlockUser }) {
  return (
    <section className="connections-page">
      <h1 className="section-title">Kết nối với mọi người</h1>
      <section className="side-card">
        <h2>Lời mời kết bạn</h2>
        {friendRequestError && <p className="feedback-message error">{friendRequestError}</p>}
        {isLoadingFriendRequests ? (
          <p>Đang tải lời mời kết bạn...</p>
        ) : friendRequests.length === 0 && !friendRequestError ? (
          <p>Bạn chưa có lời mời kết bạn nào.</p>
        ) : !friendRequestError && (
          <div className="people-list">
            {friendRequests.map((request) => (
              <div className="friend-request-row" key={request._id}>
                <Link className="connection-person-avatar" to={"/profile/" + request.senderId?._id} aria-label={`Xem trang cá nhân ${request.senderId?.username || "người dùng"}`}>
                  {request.senderId?.profilePicture ? <img src={request.senderId.profilePicture} alt="" /> : (request.senderId?.username?.charAt(0).toUpperCase() || "?")}
                </Link>
                <Link className="connection-person-name profile-name-link" to={"/profile/" + request.senderId?._id}>{request.senderId?.username || "Người dùng"}</Link>
                <div>
                  <button type="button" onClick={() => handleFriendRequestAction(request._id, "accept")}>Chấp nhận</button>
                  <button
                    type="button"
                    className="reject-request"
                    onClick={() => handleFriendRequestAction(request._id, "reject")}
                  >Từ chối</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
      <section className="side-card connections-friends-card">
        <h2>Bạn bè của bạn</h2>
        <label className="friends-search-label" htmlFor="connections-friend-search">Tìm bạn bè</label>
        <input id="connections-friend-search" className="friends-search-input" type="search" aria-label="Tìm bạn bè" placeholder="Tìm bạn bè" value={friendSearch} onChange={(event) => setFriendSearch(event.target.value)} />
        {friends.length === 0 ? <p className="friends-empty">Chưa có bạn bè.</p> : (
          filteredFriends.length > 0 ? <div className="connections-friends-list">
            {filteredFriends.map((friend) => (
              <div className="connection-friend-row" key={friend._id}>
                <Link className="connection-person-avatar" to={"/profile/" + friend._id} aria-label={`Xem trang cá nhân ${friend.username}`}>
                  {friend.profilePicture ? <img src={friend.profilePicture} alt="" /> : (friend.username?.charAt(0).toUpperCase() || "?")}
                </Link>
                <Link className="connection-person-name profile-name-link" to={"/profile/" + friend._id}>{friend.username}<FriendPresence friend={friend} /></Link>
                <button className="btn-outline" type="button" onClick={() => handleStartConversation(friend._id)}>Nhắn tin</button>
                <button className="connection-unfriend-button" type="button" onClick={() => handleUnfriend(friend)}>Hủy kết bạn</button>
              </div>
            ))}
          </div> : <p className="friends-empty">Không tìm thấy bạn bè nào.</p>
        )}
      </section>
      <section className="side-card">
        <h2>{searchQuery ? "Kết quả tìm kiếm" : "Gợi ý kết bạn"}</h2>
        {isLoadingPeople && <p>Đang tìm người dùng...</p>}
        {peopleError && <p className="feedback-message error">{peopleError}</p>}
        {!isLoadingPeople && !peopleError && people.length === 0 && (
          <p>Chưa có người dùng phù hợp.</p>
        )}
        <div className="people-list">
          {people.map((person) => (
            <div className="person-row" key={person._id}>
              <Link className="person-avatar" to={`/profile/${person._id}`} aria-label={`Xem trang cá nhân ${person.username}`}>
                {person.profilePicture ? <img src={person.profilePicture} alt="" /> : (person.username?.charAt(0).toUpperCase() || "?")}
              </Link>
              <div className="person-info">
                <Link className="profile-name-link" to={`/profile/${person._id}`}>{person.username}</Link>
                {person.bio && <span>{person.bio}</span>}
              </div>
              <button
                type="button"
                disabled={sentRequestIds.includes(person._id) || sendingFriendRequestIds.includes(person._id)}
                onClick={() => handleSendFriendRequest(person._id)}
              >{sentRequestIds.includes(person._id) ? "Đã gửi" : "Kết bạn"}</button>
              <button
                className="block-user-button"
                type="button"
                onClick={() => handleBlockUser(person._id)}
              >Chặn</button>
            </div>
          ))}
        </div>
      </section>
    </section>
  );
}
