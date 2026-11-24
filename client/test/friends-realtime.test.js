import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const layout = readFileSync(new URL("../src/AppLayout.jsx", import.meta.url), "utf8");
const feed = readFileSync(new URL("../src/pages/FeedPage.jsx", import.meta.url), "utf8");

test("friend notifications refresh active connections and preserve their badge handling", () => {
  assert.match(layout, /\["friend_request", "friend_accept", "friend_reject"\]\.includes\(notification\.type\)/);
  assert.match(layout, /setFriendsVersion\(\(version\) => version \+ 1\)/);
  assert.match(layout, /setRequestCount\(\(requests\.request \|\| \[\]\)\.length\)/);
  assert.match(feed, /if \(activeSection !== "connections"\) return undefined/);
  assert.match(feed, /\[activeSection, friendsVersion, searchQuery\]/);
  assert.match(feed, /window\.addEventListener\("focus", handleFocus\)/);
  assert.match(feed, /\/api\/friend\/requests/);
  assert.match(feed, /\/api\/friend`/);
});
