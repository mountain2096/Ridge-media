import { resolveMediaUrl } from "../lib/api.js";
import { useState } from "react";

// Text input that suggests people when you type "@". `candidates` is a list
// of { _id, username, profilePicture }. Arrow keys + Enter/Tab pick, Esc closes.
const TOKEN = /(^|\s)@([\p{L}\p{N}_.]*)$/u;

function MentionInput({ value, onChange, candidates = [], inputRef, ...inputProps }) {
  const [token, setToken] = useState(null); // { start, query }
  const [active, setActive] = useState(0);

  const matches = token
    ? candidates
      .filter((person) => person.username.toLowerCase().startsWith(token.query.toLowerCase()))
      .slice(0, 6)
    : [];
  const open = matches.length > 0;

  function updateToken(text, caret) {
    const before = text.slice(0, caret);
    const found = before.match(TOKEN);
    setToken(found ? { start: caret - found[2].length - 1, query: found[2] } : null);
    setActive(0);
  }

  function handleChange(event) {
    onChange(event.target.value);
    updateToken(event.target.value, event.target.selectionStart ?? event.target.value.length);
  }

  function pick(person) {
    const input = inputRef?.current;
    const caret = input?.selectionStart ?? value.length;
    const next = `${value.slice(0, token.start)}@${person.username} ${value.slice(caret)}`;
    const nextCaret = token.start + person.username.length + 2;
    onChange(next);
    setToken(null);
    window.setTimeout(() => {
      input?.focus();
      input?.setSelectionRange(nextCaret, nextCaret);
    }, 0);
  }

  function handleKeyDown(event) {
    if (!open) return;
    if (event.key === "ArrowDown") { event.preventDefault(); setActive((index) => (index + 1) % matches.length); }
    else if (event.key === "ArrowUp") { event.preventDefault(); setActive((index) => (index - 1 + matches.length) % matches.length); }
    else if (event.key === "Enter" || event.key === "Tab") { event.preventDefault(); pick(matches[active] || matches[0]); }
    else if (event.key === "Escape") { event.preventDefault(); setToken(null); }
  }

  return (
    <span className="ridge-mention-wrap">
      <input
        {...inputProps}
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onClick={(event) => updateToken(value, event.target.selectionStart ?? value.length)}
        onBlur={() => window.setTimeout(() => setToken(null), 120)}
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        autoComplete="off"
      />
      {open && (
        <ul className="ridge-mention-list" role="listbox" aria-label="Gợi ý nhắc tên">
          {matches.map((person, index) => (
            <li key={person._id} role="option" aria-selected={index === active}>
              <button
                type="button"
                className={index === active ? "active" : ""}
                onMouseDown={(event) => { event.preventDefault(); pick(person); }}
              >
                <span className="ridge-mention-avatar" aria-hidden="true">
                  {person.profilePicture ? <img src={resolveMediaUrl(person.profilePicture)} alt="" /> : person.username.charAt(0).toUpperCase()}
                </span>
                <span>{person.username}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </span>
  );
}

export default MentionInput;
