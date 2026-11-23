export function isOwnMessage(message, userId) {
  const senderId = message?.senderId?._id || message?.senderId;
  return Boolean(senderId && userId && String(senderId) === String(userId));
}

export function recalledMessageText(message, userId, username) {
  return isOwnMessage(message, userId) ? "Bạn đã thu hồi một tin nhắn" : `${username || "Người dùng"} đã thu hồi một tin nhắn`;
}

export function messageSnippet(message) {
  if (message?.recalledAt) return "Tin nhắn đã được thu hồi";
  if (message?.type === "image") return "Ảnh";
  if (message?.type === "video") return "Video";
  if (message?.type === "sticker") return "Nhãn dán";
  return message?.content || "Tin nhắn";
}
