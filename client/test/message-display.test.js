import test from "node:test";
import assert from "node:assert/strict";
import { isOwnMessage, recalledMessageText } from "../src/lib/messageDisplay.js";

test("recalled messages keep sender ownership for populated and raw sender IDs", () => {
  assert.equal(isOwnMessage({ senderId: { _id: "sender" } }, "sender"), true);
  assert.equal(isOwnMessage({ senderId: "sender" }, "sender"), true);
  assert.equal(isOwnMessage({ senderId: { _id: "sender" } }, "other"), false);
  assert.equal(recalledMessageText({ senderId: "sender" }, "sender", "other"), "Bạn đã thu hồi một tin nhắn");
  assert.equal(recalledMessageText({ senderId: { _id: "sender" } }, "other", "Alice"), "Alice đã thu hồi một tin nhắn");
});
