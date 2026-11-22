import { API_BASE } from "./api.js";

// Same six types as the server (server/utils/reactions.js).
export const REACTIONS = [
  { type: "like", emoji: "👍", label: "Thích" },
  { type: "love", emoji: "❤️", label: "Yêu thích" },
  { type: "haha", emoji: "😆", label: "Haha" },
  { type: "wow", emoji: "😮", label: "Wow" },
  { type: "sad", emoji: "😢", label: "Buồn" },
  { type: "angry", emoji: "😡", label: "Phẫn nộ" },
];

export const reactionInfo = (type) => REACTIONS.find((item) => item.type === type) || null;

const idOf = (value) => String(value?._id || value || "");

// Old posts only have a `likes` list; every liker there counts as "like".
export function mergeLegacyLikes(reactions = [], likes = []) {
  const list = [...(reactions || [])];
  const seen = new Set(list.map((item) => idOf(item.userId)));
  for (const liker of likes || []) {
    if (!seen.has(idOf(liker))) {
      list.push({ userId: liker, reaction: "like" });
      seen.add(idOf(liker));
    }
  }
  return list;
}

export function summarizeReactions(reactions = [], userId) {
  const counts = {};
  let mine = null;
  for (const item of reactions || []) {
    if (!reactionInfo(item.reaction)) continue;
    counts[item.reaction] = (counts[item.reaction] || 0) + 1;
    if (userId && idOf(item.userId) === idOf(userId)) mine = item.reaction;
  }
  const top = REACTIONS.filter((item) => counts[item.type]).sort((a, b) => counts[b.type] - counts[a.type]);
  return { counts, total: (reactions || []).filter((item) => reactionInfo(item.reaction)).length, mine, top };
}

// Calls PUT (set) or DELETE (remove, type === null) on `path` and returns the
// parsed JSON. Throws an Error with the server message on failure.
export async function sendReaction(path, type) {
  const response = await fetch(`${API_BASE}${path}`, {
    method: type ? "PUT" : "DELETE",
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
      ...(type ? { "Content-Type": "application/json" } : {}),
    },
    body: type ? JSON.stringify({ type }) : undefined,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Không thể thả cảm xúc.");
  return data;
}

export async function fetchPostReactions(postId, { type, page = 1 } = {}) {
  const query = new URLSearchParams({ page: String(page) });
  if (type) query.set("type", type);
  const response = await fetch(`${API_BASE}/api/post/${postId}/reactions?${query}`, {
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Không thể tải danh sách cảm xúc.");
  return data;
}
