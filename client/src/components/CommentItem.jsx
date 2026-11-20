import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

function CommentItem({
  comment,
  currentUserId,
  postOwnerId,
  isAdmin,
  isEditing,
  editingContent,
  isUpdating,
  onEdit,
  onEditingChange,
  onCancelEdit,
  onUpdate,
  onDelete,
  onReport,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef(null);
  const menuRef = useRef(null);
  const isAuthor = Boolean(currentUserId)
    && (String(comment.authorId?._id || "") === String(currentUserId) || comment.isMine);
  const canEdit = Boolean(isAuthor);
  const canDelete = Boolean(isAuthor || (currentUserId && postOwnerId && String(postOwnerId) === String(currentUserId)) || isAdmin);
  const canReport = !isAuthor;
  const hasActions = canEdit || canDelete || canReport;

  useEffect(() => {
    if (!menuOpen) return undefined;
    menuRef.current?.querySelector('[role="menuitem"]')?.focus();

    function handlePointerDown(event) {
      if (menuRef.current?.contains(event.target) || menuButtonRef.current?.contains(event.target)) return;
      setMenuOpen(false);
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        setMenuOpen(false);
        menuButtonRef.current?.focus();
        return;
      }
      if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
      const menuItems = [...(menuRef.current?.querySelectorAll('[role="menuitem"]') || [])];
      if (!menuItems.length) return;
      event.preventDefault();
      const currentIndex = menuItems.indexOf(document.activeElement);
      const nextIndex = event.key === "Home" ? 0
        : event.key === "End" ? menuItems.length - 1
          : event.key === "ArrowDown" ? (currentIndex + 1 + menuItems.length) % menuItems.length
            : (currentIndex - 1 + menuItems.length) % menuItems.length;
      menuItems[nextIndex].focus();
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  function runMenuAction(action) {
    setMenuOpen(false);
    action();
  }

  return (
    <div className="comment-item ridge-comment-item">
      <Link className="comment-avatar" to={`/profile/${comment.authorId?._id}`} aria-label={`Xem trang cá nhân ${comment.authorId?.username || "người dùng"}`}>
        {comment.authorId?.profilePicture ? <img src={comment.authorId.profilePicture} alt="" /> : (comment.authorId?.username || "U").charAt(0).toUpperCase()}
      </Link>
      <div className="comment-main ridge-comment-main">
        {isEditing ? (
          <form className="comment-edit-form" onSubmit={(event) => onUpdate(event, comment._id)}>
            <input
              aria-label="Sửa nội dung bình luận"
              value={editingContent}
              onChange={(event) => onEditingChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") onCancelEdit();
              }}
              maxLength="500"
            />
            <div className="comment-edit-actions">
              <button type="submit" disabled={isUpdating}>{isUpdating ? "Đang lưu..." : "Lưu"}</button>
              <button type="button" onClick={onCancelEdit}>Hủy</button>
            </div>
          </form>
        ) : (
          <div className="ridge-comment-content-row">
            <div className="comment-bubble ridge-comment-bubble">
              <Link className="profile-name-link" to={`/profile/${comment.authorId?._id}`}>{comment.authorId?.username || "Người dùng"}</Link>
              <p>{comment.content}</p>
            </div>
            {hasActions && (
              <div className="post-menu-wrap ridge-comment-menu-wrap">
                <button
                  className="post-more ridge-comment-more"
                  type="button"
                  aria-label="Tùy chọn bình luận"
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                  ref={menuButtonRef}
                  onClick={() => setMenuOpen((open) => !open)}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="6" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="18" cy="12" r="1.6"/></svg>
                </button>
                {menuOpen && (
                  <div className="post-menu ridge-comment-menu" role="menu" ref={menuRef} aria-label="Tùy chọn bình luận">
                    {canEdit && <button type="button" role="menuitem" onClick={() => runMenuAction(() => onEdit(comment))}>Chỉnh sửa</button>}
                    {canDelete && <button className="danger" type="button" role="menuitem" onClick={() => runMenuAction(onDelete)}>Xóa</button>}
                    {canReport && <button type="button" role="menuitem" onClick={() => runMenuAction(onReport)}>Báo cáo</button>}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default CommentItem;
