// Emoji lists, sticker packs and the helpers behind the message icon picker.
// Sticker artwork is original and drawn here as small SVG strings, so there are
// no image files and no third-party licences to track.
// Sticker ids (pack id + "-" + sticker name) must match server/utils/stickers.js.
// server/test/stickers.test.js fails when the two lists drift apart.

const INK = "#3b2a00";

const svgUri = (body) =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">${body}</svg>`)}`;

const line = (d, width = 6, color = INK) =>
  `<path d="${d}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`;

const eye = (cx, cy, rx = 5.5, ry = 8) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${INK}"/>`;

const heart = (cx, cy, scale) =>
  `<path transform="translate(${cx} ${cy}) scale(${scale})" d="M0 9C-18 -3 -15 -19 -5 -17C-1 -16 0 -13 0 -11C0 -13 1 -16 5 -17C15 -19 18 -3 0 9Z" fill="#e0245e"/>`;

const cheek = (cx, cy) => `<ellipse cx="${cx}" cy="${cy}" rx="9" ry="6" fill="#ff8fa3" opacity="0.7"/>`;

const face = (parts, fill = "#ffd84d", edge = "#e5a800") =>
  svgUri(`<circle cx="64" cy="64" r="58" fill="${fill}" stroke="${edge}" stroke-width="4"/>${parts}`);

const badge = (lines, bg, edge, fg = "#ffffff") => {
  const longest = Math.max(...lines.map((text) => text.length));
  const size = lines.length > 1 ? 30 : Math.max(20, Math.min(44, Math.floor(104 / (longest * 0.6))));
  const lineHeight = size * 1.1;
  const firstY = 60 - ((lines.length - 1) * lineHeight) / 2 + size * 0.35;
  const text = lines
    .map((value, index) =>
      `<text x="64" y="${(firstY + index * lineHeight).toFixed(1)}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="800" font-size="${size}" fill="${fg}">${value}</text>`)
    .join("");
  return svgUri(
    `<path d="M26 98L20 121L48 102Z" fill="${bg}" stroke="${edge}" stroke-width="4" stroke-linejoin="round"/>` +
    `<rect x="6" y="14" width="116" height="92" rx="26" fill="${bg}" stroke="${edge}" stroke-width="4"/>${text}`
  );
};

export const STICKER_PACKS = [
  {
    id: "faces",
    title: "Mặt cười Ridge",
    stickers: [
      { name: "smile", label: "Cười", keywords: "cuoi vui smile", src: face(`${eye(44, 52)}${eye(84, 52)}${line("M38 78Q64 104 90 78")}`) },
      { name: "laugh", label: "Cười lớn", keywords: "cuoi lon haha", src: face(`${line("M34 56Q44 44 54 56")}${line("M74 56Q84 44 94 56")}<path d="M34 74Q64 116 94 74Z" fill="#7a1f1f"/><ellipse cx="64" cy="97" rx="13" ry="7" fill="#ff7a7a"/>`) },
      { name: "love", label: "Yêu thích", keywords: "yeu thich tim love", src: face(`${heart(44, 54, 0.95)}${heart(84, 54, 0.95)}${cheek(26, 80)}${cheek(102, 80)}${line("M44 80Q64 98 84 80")}`) },
      { name: "wink", label: "Nháy mắt", keywords: "nhay mat wink", src: face(`${eye(44, 52)}${line("M74 56Q84 46 94 56")}${line("M38 78Q62 102 92 74")}`) },
      { name: "sad", label: "Buồn", keywords: "buon khoc sad", src: face(`${eye(44, 56)}${eye(84, 56)}${line("M32 40L54 47", 5)}${line("M96 40L74 47", 5)}${line("M42 94Q64 72 86 94")}<path d="M90 64Q99 78 90 85Q81 78 90 64Z" fill="#5ab4ff"/>`) },
      { name: "angry", label: "Giận", keywords: "gian tuc gian du angry", src: face(`${eye(46, 62, 5, 7)}${eye(82, 62, 5, 7)}${line("M28 38L56 54", 8)}${line("M100 38L72 54", 8)}${line("M44 96Q64 80 84 96")}`, "#ff8a65", "#d9421f") },
      { name: "sleepy", label: "Buồn ngủ", keywords: "ngu buon ngu sleepy", src: face(`${line("M34 58Q44 68 54 58")}${line("M74 58Q84 68 94 58")}<ellipse cx="64" cy="92" rx="7" ry="9" fill="${INK}"/><text x="92" y="36" font-family="Arial, sans-serif" font-weight="800" font-size="22" fill="#5a6b9a">z</text><text x="104" y="22" font-family="Arial, sans-serif" font-weight="800" font-size="15" fill="#5a6b9a">z</text>`) },
      { name: "cool", label: "Ngầu", keywords: "ngau kinh ram cool", src: face(`<path d="M24 46H60V62Q60 76 42 76Q24 76 24 62Z" fill="#222"/><path d="M68 46H104V62Q104 76 86 76Q68 76 68 62Z" fill="#222"/>${line("M58 50H70", 5, "#222")}${line("M42 90Q64 102 90 84")}`) },
    ],
  },
  {
    id: "words",
    title: "Lời nhắn",
    stickers: [
      { name: "hello", label: "Xin chào", keywords: "xin chao hello hi", src: badge(["Xin", "chào!"], "#4f7cff", "#2f56d6") },
      { name: "thanks", label: "Cảm ơn", keywords: "cam on thanks", src: badge(["Cảm", "ơn!"], "#ff7aa2", "#d9477a") },
      { name: "ok", label: "OK", keywords: "ok dong y duoc", src: badge(["OK!"], "#3dbe7a", "#23925a") },
      { name: "great", label: "Tuyệt", keywords: "tuyet tuyet voi great", src: badge(["Tuyệt!"], "#ffb020", "#d98a00", "#3b2a00") },
      { name: "sorry", label: "Xin lỗi", keywords: "xin loi sorry", src: badge(["Xin", "lỗi"], "#8e7cff", "#6753d9") },
      { name: "goodnight", label: "Ngủ ngon", keywords: "ngu ngon chuc ngu ngon goodnight", src: badge(["Ngủ", "ngon"], "#37406e", "#222a52") },
      { name: "haha", label: "Haha", keywords: "haha buon cuoi", src: badge(["Haha"], "#ff6b4a", "#d94a2a") },
      { name: "wait", label: "Chờ chút", keywords: "cho chut doi chut wait", src: badge(["Chờ", "chút"], "#17a2b8", "#0f7d8e") },
    ],
  },
];

export function normalizeSearch(value = "") {
  return String(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/gi, "d").toLowerCase();
}

export const STICKERS = STICKER_PACKS.flatMap((pack) =>
  pack.stickers.map((sticker) => ({
    ...sticker,
    id: `${pack.id}-${sticker.name}`,
    packId: pack.id,
    search: normalizeSearch(`${sticker.label} ${sticker.keywords} ${pack.title}`),
  }))
);

const stickerById = new Map(STICKERS.map((sticker) => [sticker.id, sticker]));

export const findSticker = (id) => stickerById.get(id) || null;

// Each entry is the emoji, a space, then search words (no diacritics).
const parseEmoji = (entries) =>
  entries.map((entry) => {
    const cut = entry.indexOf(" ");
    return { char: entry.slice(0, cut), search: normalizeSearch(entry.slice(cut + 1)) };
  });

export const EMOJI_CATEGORIES = [
  {
    key: "smileys",
    title: "Cảm xúc",
    icon: "😀",
    items: parseEmoji([
      "😀 cuoi vui smile", "😃 cuoi vui", "😄 cuoi vui", "😁 cuoi toe", "😆 cuoi lon", "😅 cuoi do mo hoi",
      "😂 cuoi chay nuoc mat haha", "🤣 cuoi lan", "🙂 cuoi nhe", "😉 nhay mat wink", "😊 hanh phuc e then",
      "😇 thien than", "🥰 yeu thuong", "😍 yeu me", "🤩 wow sao", "😘 hon", "😋 ngon", "😛 le luoi",
      "😜 nhay mat le luoi", "🤪 dien", "🤗 om", "🤔 suy nghi", "😐 tro tron", "🙄 lien mat chan", "😏 nhech mep",
      "😴 ngu", "😌 nhe nhom", "😔 buon", "😢 khoc", "😭 khoc nhieu", "😤 gian tuc", "😡 gian du phan no",
      "🥺 nai nan cau xin", "😱 so hai", "😳 ngai ngung", "🥳 an mung tiec", "😎 ngau kinh ram", "🤓 mot sach",
      "😷 khau trang om", "🤒 sot om",
    ]),
  },
  {
    key: "gestures",
    title: "Cử chỉ",
    icon: "👍",
    items: parseEmoji([
      "👍 thich like tot ok", "👎 khong thich te", "👌 ok tuyet", "✌️ chien thang hoa binh", "🤞 cau may", "🤟 yeu",
      "🤘 rock", "👏 vo tay", "🙌 hoan ho", "🙏 cam on cau nguyen", "💪 manh me co bap", "👋 chao tam biet",
      "🤝 bat tay", "✋ dung lai", "👊 dam", "✊ nam tay", "🤙 goi dien", "👈 trai", "👉 phai", "👆 len", "👇 xuong",
    ]),
  },
  {
    key: "hearts",
    title: "Tim & ăn mừng",
    icon: "❤️",
    items: parseEmoji([
      "❤️ tim yeu", "🧡 tim cam", "💛 tim vang", "💚 tim xanh la", "💙 tim xanh duong", "💜 tim tim", "🖤 tim den",
      "🤍 tim trang", "💔 tim vo that tinh", "💕 hai trai tim", "💞 tim xoay", "💓 tim dap", "💗 tim lon",
      "💖 tim lap lanh", "💘 tim mui ten", "💝 tim qua", "✨ lap lanh", "⭐ sao", "🌟 ngoi sao", "🔥 lua hot",
      "🎉 chuc mung phao", "🎊 an mung", "💯 100 diem tuyet doi",
    ]),
  },
  {
    key: "nature",
    title: "Thiên nhiên",
    icon: "🐶",
    items: parseEmoji([
      "🐶 cho", "🐱 meo", "🐭 chuot", "🐹 chuot hamster", "🐰 tho", "🦊 cao", "🐻 gau", "🐼 gau truc panda",
      "🐨 koala", "🐯 ho", "🦁 su tu", "🐮 bo", "🐷 heo lon", "🐸 ech", "🐵 khi", "🐔 ga", "🐧 chim canh cut",
      "🐦 chim", "🐢 rua", "🐙 bach tuoc", "🦋 buom", "🌸 hoa anh dao", "🌼 hoa", "🌻 huong duong", "🌹 hoa hong",
      "🌳 cay", "🌈 cau vong", "☀️ nang mat troi", "🌙 trang dem", "⛅ may", "❄️ tuyet lanh",
    ]),
  },
  {
    key: "objects",
    title: "Đồ vật & đồ ăn",
    icon: "🍕",
    items: parseEmoji([
      "🍎 tao", "🍌 chuoi", "🍉 dua hau", "🍓 dau tay", "🍕 pizza", "🍔 hamburger", "🍟 khoai tay chien",
      "🌭 xuc xich", "🍜 mi pho", "🍣 sushi", "🍰 banh kem", "🍩 donut", "🍪 banh quy", "☕ ca phe", "🧋 tra sua",
      "🍺 bia", "⚽ bong da", "🎮 game", "🎵 nhac", "🎧 tai nghe", "📷 may anh", "💻 may tinh", "📱 dien thoai",
      "🎁 qua", "🚗 xe hoi", "✈️ may bay", "🏠 nha", "📚 sach", "💡 y tuong den",
    ]),
  },
];

export const ALL_EMOJI = EMOJI_CATEGORIES.flatMap((category) => category.items);

const RECENT_KEY = "ridge:recent-emoji";
const RECENT_LIMIT = 24;

export function loadRecentEmoji() {
  try {
    const stored = JSON.parse(localStorage.getItem(RECENT_KEY));
    return Array.isArray(stored)
      ? stored.filter((item) => typeof item === "string").slice(0, RECENT_LIMIT)
      : [];
  } catch {
    return [];
  }
}

export function rememberEmoji(char) {
  const next = [char, ...loadRecentEmoji().filter((item) => item !== char)].slice(0, RECENT_LIMIT);
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    // Private mode or full storage: the picker still works, just without "recent".
  }
  return next;
}
