import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "../lib/api.js";
import "../search.css";

const recentKey = (userId) => `ridge:recent-searches:${userId}`;

function readRecentSearches(userId) {
  if (!userId) return [];
  try {
    const stored = JSON.parse(window.localStorage.getItem(recentKey(userId)) || "[]");
    if (!Array.isArray(stored)) return [];
    return stored.slice(0, 8).filter((item) => item && item.id && item.displayName).map((item) => ({
      id: String(item.id),
      displayName: String(item.displayName),
      avatarUrl: typeof item.avatarUrl === "string" ? item.avatarUrl : "",
    }));
  } catch {
    return [];
  }
}

function writeRecentSearches(userId, searches) {
  if (!userId) return;
  try {
    window.localStorage.setItem(recentKey(userId), JSON.stringify(searches.slice(0, 8).map(({ id, displayName, avatarUrl }) => ({
      id,
      displayName,
      avatarUrl,
    }))));
  } catch {
    // Search remains usable if browser storage is unavailable.
  }
}

function toSearchItem(user) {
  return {
    id: user._id || user.id ? String(user._id || user.id) : "",
    displayName: user.username || user.displayName || "Người dùng",
    avatarUrl: typeof user.profilePicture === "string" ? user.profilePicture : (user.avatarUrl || ""),
  };
}

function UserAvatar({ item }) {
  return <span className="user-search-avatar">{item.avatarUrl ? <img src={item.avatarUrl} alt="" /> : item.displayName.charAt(0).toUpperCase()}</span>;
}

function UserSearch({ currentUser }) {
  const navigate = useNavigate();
  const rootRef = useRef(null);
  const userId = currentUser?._id ? String(currentUser._id) : "";
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [recents, setRecents] = useState(() => readRecentSearches(userId));
  const [searchData, setSearchData] = useState({ query: "", status: "idle", results: [], error: "" });
  const [activeIndex, setActiveIndex] = useState(-1);
  const trimmedQuery = query.trim();
  const hasSearchData = searchData.query === trimmedQuery;
  const results = hasSearchData ? searchData.results : [];
  const error = hasSearchData ? searchData.error : "";
  const isSearching = Boolean(trimmedQuery && (!hasSearchData || searchData.status === "loading"));
  const options = trimmedQuery ? results : recents;

  useEffect(() => {
    function closeOnOutsidePointer(event) {
      if (!rootRef.current?.contains(event.target)) {
        setIsOpen(false);
        setActiveIndex(-1);
      }
    }
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, []);

  useEffect(() => {
    if (!isOpen || !trimmedQuery) return undefined;

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearchData({ query: trimmedQuery, status: "loading", results: [], error: "" });
      try {
        const token = window.localStorage.getItem("token");
        const response = await fetch(`${API_BASE}/api/user/search?q=${encodeURIComponent(trimmedQuery)}`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Không thể tìm người dùng.");
        setSearchData({
          query: trimmedQuery,
          status: "success",
          results: (data.users || []).map(toSearchItem).filter((item) => item.id),
          error: "",
        });
      } catch (requestError) {
        if (requestError.name !== "AbortError") {
          setSearchData({ query: trimmedQuery, status: "error", results: [], error: requestError.message || "Không thể tìm người dùng." });
        }
      }
    }, 300);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [isOpen, trimmedQuery, userId]);

  function saveRecent(item) {
    const minimalItem = { id: item.id, displayName: item.displayName, avatarUrl: item.avatarUrl || "" };
    const nextRecents = [minimalItem, ...recents.filter((recent) => recent.id !== minimalItem.id)].slice(0, 8);
    setRecents(nextRecents);
    writeRecentSearches(userId, nextRecents);
  }

  function selectItem(item) {
    saveRecent(item);
    setIsOpen(false);
    setActiveIndex(-1);
    setQuery("");
    navigate(`/profile/${item.id}`);
  }

  function removeRecent(event, itemId) {
    event.stopPropagation();
    const nextRecents = recents.filter((item) => item.id !== itemId);
    setRecents(nextRecents);
    writeRecentSearches(userId, nextRecents);
    setActiveIndex(-1);
  }

  function handleKeyDown(event) {
    if (event.key === "Escape") {
      setIsOpen(false);
      setActiveIndex(-1);
    } else if (event.key === "ArrowDown" && options.length) {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((index) => (index + 1) % options.length);
    } else if (event.key === "ArrowUp" && options.length) {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((index) => (index <= 0 ? options.length - 1 : index - 1));
    } else if (event.key === "Enter" && activeIndex >= 0 && options[activeIndex]) {
      event.preventDefault();
      selectItem(options[activeIndex]);
    }
  }

  return (
    <div className="user-search-wrap" ref={rootRef}>
      <div className="news-search">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
        <input
          type="search"
          role="combobox"
          aria-label="Tìm người dùng"
          aria-autocomplete="list"
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-controls={isOpen && (trimmedQuery ? !isSearching && !error && results.length > 0 : true) ? "user-search-listbox" : undefined}
          aria-activedescendant={activeIndex >= 0 ? `user-search-option-${activeIndex}` : undefined}
          placeholder="Tìm người dùng..."
          value={query}
          onFocus={() => setIsOpen(true)}
          onClick={() => setIsOpen(true)}
          onChange={(event) => { setQuery(event.target.value); setIsOpen(true); setActiveIndex(-1); }}
          onKeyDown={handleKeyDown}
        />
      </div>
      {isOpen && <div className="user-search-panel">
        {!trimmedQuery && <header className="user-search-panel-heading"><h2>Mới đây</h2><button type="button" onClick={() => { setRecents([]); setActiveIndex(-1); if (userId) { try { window.localStorage.removeItem(recentKey(userId)); } catch { /* Search remains usable if browser storage is unavailable. */ } } }}>Xóa tất cả</button></header>}
        {trimmedQuery && isSearching && <p className="user-search-status" role="status" aria-live="polite">Đang tìm...</p>}
        {trimmedQuery && error && <p className="user-search-error" role="alert">{error}</p>}
        {trimmedQuery && !isSearching && !error && results.length === 0 && <p className="user-search-status">Không tìm thấy người dùng nào.</p>}
        {!trimmedQuery && <div id="user-search-listbox" className="user-search-list" role="listbox" aria-label="Tìm kiếm gần đây">
          {recents.map((item, index) => <div className="user-search-recent" role="option" aria-selected={activeIndex === index} id={`user-search-option-${index}`} key={item.id} onClick={() => selectItem(item)}>
            <UserAvatar item={item} /><span className="user-search-name">{item.displayName}</span>
            <button className="user-search-remove" type="button" aria-label={`Xóa ${item.displayName} khỏi tìm kiếm gần đây`} onClick={(event) => removeRecent(event, item.id)}>×</button>
          </div>)}
        </div>}
        {trimmedQuery && !isSearching && !error && results.length > 0 && <div id="user-search-listbox" className="user-search-list" role="listbox" aria-label="Kết quả tìm kiếm">
          {results.map((item, index) => <button className="user-search-result" type="button" role="option" aria-selected={activeIndex === index} id={`user-search-option-${index}`} key={item.id} onClick={() => selectItem(item)}>
            <UserAvatar item={item} /><span className="user-search-name">{item.displayName}</span>
          </button>)}
        </div>}
      </div>}
    </div>
  );
}

export default UserSearch;
