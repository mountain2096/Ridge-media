import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MessageActionMenu } from "../src/lib/messageMenu.js";

test("own message actions render as children of one menu container", () => {
  const html = renderToStaticMarkup(createElement(MessageActionMenu, { isMine: true }));
  assert.match(html, /^<div class="ridge-msg-menu" role="menu"><button[^>]*>.*<\/button><button[^>]*>.*<\/button><\/div>$/);
  assert.ok(html.includes("Thu h\u1ed3i"));
  assert.ok(html.includes("X\u00f3a \u1edf ph\u00eda t\u00f4i"));
});

test("incoming message menu only renders delete", () => {
  const html = renderToStaticMarkup(createElement(MessageActionMenu, { isMine: false }));
  assert.match(html, /^<div class="ridge-msg-menu" role="menu"><button[^>]*>.*<\/button><\/div>$/);
  assert.ok(html.includes("X\u00f3a \u1edf ph\u00eda t\u00f4i"));
  assert.ok(!html.includes("Thu h\u1ed3i"));
});
