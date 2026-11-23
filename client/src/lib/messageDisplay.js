export function isOwnMessage(message, userId) {
  const senderId = message?.senderId?._id || message?.senderId;
  return Boolean(senderId && userId && String(senderId) === String(userId));
}

export function recalledMessageText(message, userId, username) {
  return isOwnMessage(message, userId) ? "Bạn đã thu hồi một tin nhắn" : `${username || "Người dùng"} đã thu hồi một tin nhắn`;
}
