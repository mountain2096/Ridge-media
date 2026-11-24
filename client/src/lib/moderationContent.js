export function moderationContentPath(item) {
  if (!item.target?.available) return null;
  if (item.targetType === "comment") return `/post/${item.target.postId}?comment=${item.targetId}`;
  if (item.targetType === "post") return `/post/${item.targetId}`;
  return item.targetType === "user" ? `/profile/${item.targetId}` : null;
}
