export default function StoryStrip({ currentUser, myStoryGroup, storyGroups, storyFeedback, onOpenStory, onAddStory }) {
  return (
    <div className="stories-card card">
      {storyFeedback && <p className="feedback-message error">{storyFeedback}</p>}
      <div className="story-list">
        <div className="story-item story-item-self">
          <span className="story-avatar-wrap">
            <button className="story-avatar-button" type="button" aria-label={myStoryGroup ? "Xem story của bạn" : "Ảnh đại diện của bạn"} onClick={() => myStoryGroup && onOpenStory(myStoryGroup)}>
              <span className={`story-ring ${myStoryGroup ? "" : "story-ring-add"}`}>
                <span className="story-avatar story-self">
                  {currentUser?.profilePicture ? <img src={currentUser.profilePicture} alt="" /> : (currentUser?.username?.charAt(0).toUpperCase() || "R")}
                </span>
              </span>
            </button>
            <button className="story-add-button" type="button" aria-label="Thêm story" onClick={onAddStory}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
            </button>
          </span>
          <span className="story-name">Tạo tin</span>
        </div>
        {storyGroups
          .filter((group) => group.author._id !== currentUser?._id)
          .map((group) => (
            <button
              className="story-item story-item-friend"
              key={group.author._id}
              type="button"
              onClick={() => {
                onOpenStory(group);
              }}
            >
              <span className="story-ring">
                <span className="story-avatar story-blue">
                  {group.author.profilePicture ? (
                    <img src={group.author.profilePicture} alt="" />
                  ) : (group.author.username?.charAt(0).toUpperCase() || "?")}
                </span>
              </span>
              <span className="story-name">{group.author.username}</span>
            </button>
          ))}
      </div>
    </div>
  );
}
