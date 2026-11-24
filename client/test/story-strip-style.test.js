import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const feed = readFileSync(new URL("../src/feed-redesign.css", import.meta.url), "utf8");
const dark = readFileSync(new URL("../src/dark-mode.css", import.meta.url), "utf8");
const stories = readFileSync(new URL("../src/stories.css", import.meta.url), "utf8");

test("story strip stays transparent in both themes without clipping its scroll row", () => {
  assert.match(feed, /\.home-layout \.stories-card\s*\{[^}]*overflow:\s*visible[^}]*background:\s*transparent[^}]*box-shadow:\s*none/s);
  assert.match(stories, /\.stories-card \.story-list\s*\{[^}]*overflow-x:\s*auto/s);
  assert.match(dark, /\.home-layout \.card:not\(\.stories-card\)/);
  assert.match(feed, /\.home-layout \.card:not\(\.stories-card\)/);
});
