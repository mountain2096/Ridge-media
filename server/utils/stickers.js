// Allow-list of sticker ids. The artwork lives in the client
// (client/src/lib/stickers.js); the server only stores the id, so a client can
// never make it save an arbitrary string as a sticker.
// Keep both lists in sync: server/test/stickers.test.js fails when they drift.

const STICKER_PACKS = [
    {
        id: "faces",
        stickers: ["smile", "laugh", "love", "wink", "sad", "angry", "sleepy", "cool"],
    },
    {
        id: "words",
        stickers: ["hello", "thanks", "ok", "great", "sorry", "goodnight", "haha", "wait"],
    },
];

const STICKER_IDS = STICKER_PACKS.flatMap((pack) => pack.stickers.map((name) => `${pack.id}-${name}`));
const STICKER_ID_SET = new Set(STICKER_IDS);

// Stored in `content` so previews, toasts and old clients show readable text.
const STICKER_PREVIEW = "Đã gửi một nhãn dán";

const isStickerId = (value) => typeof value === "string" && STICKER_ID_SET.has(value);

module.exports = { STICKER_PACKS, STICKER_IDS, STICKER_PREVIEW, isStickerId };
