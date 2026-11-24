import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const feed = readFileSync(new URL("../src/feed-redesign.css", import.meta.url), "utf8");
const dark = readFileSync(new URL("../src/dark-mode.css", import.meta.url), "utf8");
const reactions = readFileSync(new URL("../src/reactions.css", import.meta.url), "utf8");

test("dark polish surfaces use theme tokens and preserve unread distinction", () => {
  assert.match(feed, /--news-unread:\s*#E6EBFF/);
  assert.match(feed, /html\[data-theme="dark"\][\s\S]*?--news-unread:\s*#30364a/);
  assert.match(feed, /\.notification-item\.unread\s*\{\s*background:\s*var\(--news-unread\)/);
  assert.match(feed, /\.privacy-options[^}]*background:\s*var\(--news-surface\)/);
  assert.match(feed, /\.news-search input\s*\{\s*border:\s*0;\s*background:\s*transparent/);
  assert.match(dark, /\.ridge-conversation-panel:not\(\[class\*="chat-bg-"\]\) \.ridge-message-compose/);
  assert.match(reactions, /background:\s*var\(--chat-surface,\s*var\(--news-surface/);
});

test("dark mode leaves shared layout wrappers transparent while retaining panel surfaces", () => {
  assert.doesNotMatch(feed, /html\[data-theme="dark"\] \.home-sidebar\s*,/);
  assert.doesNotMatch(feed, /html\[data-theme="dark"\] \.home-columns > \*\s*,/);
  assert.match(feed, /html\[data-theme="dark"\] \.ridge-conversation-panel/);
  assert.doesNotMatch(dark, /html\[data-theme="dark"\] \.home-sidebar\s*,/);
  assert.match(dark, /html\[data-theme="dark"\] \.post-card/);
});
