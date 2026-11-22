import { useEffect, useMemo, useRef, useState } from "react";
import {
  ALL_EMOJI,
  EMOJI_CATEGORIES,
  STICKERS,
  STICKER_PACKS,
  loadRecentEmoji,
  normalizeSearch,
  rememberEmoji,
} from "../lib/stickers.js";
import "../stickers.css";

const TABS = [
  { key: "recent", icon: "🕘", label: "Gần đây" },
  ...EMOJI_CATEGORIES.map((category) => ({ key: category.key, icon: category.icon, label: category.title })),
  { key: "stickers", icon: "💬", label: "Nhãn dán" },
];

function EmojiGrid({ chars, onPick }) {
  return (
    <div className="ridge-emoji-grid">
      {chars.map((char) => (
        <button className="ridge-emoji-btn" type="button" key={char} onClick={() => onPick(char)}>{char}</button>
      ))}
    </div>
  );
}

function StickerGrid({ stickers, onPick }) {
  return (
    <div className="ridge-sticker-grid">
      {stickers.map((sticker) => (
        <button className="ridge-sticker-btn" type="button" key={sticker.id} aria-label={`Gửi nhãn dán ${sticker.label}`} title={sticker.label} onClick={() => onPick(sticker.id)}>
          <img src={sticker.src} alt="" loading="lazy" />
        </button>
      ))}
    </div>
  );
}

function EmojiStickerPicker({ onPickEmoji, onPickSticker, onClose, toggleRef }) {
  const [recent, setRecent] = useState(loadRecentEmoji);
  const [tab, setTab] = useState(() => (recent.length > 0 ? "recent" : "smileys"));
  const [packId, setPackId] = useState(STICKER_PACKS[0].id);
  const [query, setQuery] = useState("");
  const rootRef = useRef(null);
  const searchRef = useRef(null);

  const needle = normalizeSearch(query.trim());
  const results = useMemo(() => {
    if (!needle) return null;
    return {
      emoji: ALL_EMOJI.filter((item) => item.search.includes(needle)).slice(0, 60),
      stickers: STICKERS.filter((item) => item.search.includes(needle)),
    };
  }, [needle]);

  useEffect(() => {
    // Skip auto-focus on touch devices so the on-screen keyboard does not pop up.
    if (window.matchMedia?.("(hover: hover)").matches) searchRef.current?.focus();
  }, []);

  useEffect(() => {
    function handlePointerDown(event) {
      if (rootRef.current?.contains(event.target) || toggleRef?.current?.contains(event.target)) return;
      onClose();
    }
    function handleKeyDown(event) {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      onClose(true);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, toggleRef]);

  function handlePickEmoji(char) {
    setRecent(rememberEmoji(char));
    onPickEmoji(char);
  }

  const activePack = STICKER_PACKS.find((pack) => pack.id === packId) || STICKER_PACKS[0];
  const activeCategory = EMOJI_CATEGORIES.find((category) => category.key === tab);

  let body;
  if (results) {
    body = results.emoji.length === 0 && results.stickers.length === 0
      ? <p className="ridge-picker-empty">Không tìm thấy kết quả.</p>
      : <>
        {results.emoji.length > 0 && <>
          <h2 className="ridge-picker-heading">Biểu tượng</h2>
          <EmojiGrid chars={results.emoji.map((item) => item.char)} onPick={handlePickEmoji} />
        </>}
        {results.stickers.length > 0 && <>
          <h2 className="ridge-picker-heading">Nhãn dán</h2>
          <StickerGrid stickers={results.stickers} onPick={onPickSticker} />
        </>}
      </>;
  } else if (tab === "recent") {
    body = recent.length === 0
      ? <p className="ridge-picker-empty">Chưa có biểu tượng gần đây.</p>
      : <EmojiGrid chars={recent} onPick={handlePickEmoji} />;
  } else if (tab === "stickers") {
    body = <>
      <div className="ridge-picker-packs">
        {STICKER_PACKS.map((pack) => (
          <button className={`ridge-picker-pack ${pack.id === activePack.id ? "active" : ""}`} type="button" key={pack.id} aria-pressed={pack.id === activePack.id} onClick={() => setPackId(pack.id)}>{pack.title}</button>
        ))}
      </div>
      <StickerGrid stickers={STICKERS.filter((sticker) => sticker.packId === activePack.id)} onPick={onPickSticker} />
    </>;
  } else {
    body = <EmojiGrid chars={(activeCategory || EMOJI_CATEGORIES[0]).items.map((item) => item.char)} onPick={handlePickEmoji} />;
  }

  return (
    <div className="ridge-picker" role="dialog" aria-label="Chọn biểu tượng và nhãn dán" ref={rootRef}>
      <input
        ref={searchRef}
        className="ridge-picker-search"
        type="search"
        aria-label="Tìm biểu tượng hoặc nhãn dán"
        placeholder="Tìm biểu tượng hoặc nhãn dán"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      {!needle && (
        <div className="ridge-picker-tabs" role="tablist" aria-label="Nhóm biểu tượng">
          {TABS.map((item) => (
            <button
              className="ridge-picker-tab"
              type="button"
              role="tab"
              key={item.key}
              aria-selected={tab === item.key}
              aria-label={item.label}
              title={item.label}
              onClick={() => setTab(item.key)}
            >{item.icon}</button>
          ))}
        </div>
      )}
      <div className="ridge-picker-body">{body}</div>
    </div>
  );
}

export default EmojiStickerPicker;
