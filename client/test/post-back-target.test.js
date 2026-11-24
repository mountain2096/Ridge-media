import test from "node:test";
import assert from "node:assert/strict";
import { postBackTarget } from "../src/lib/postBackTarget.js";

test("post back target restores moderation when opened from its queue", () => {
  assert.deepEqual(postBackTarget({ from: "/admin", tab: "moderation" }), {
    to: "/admin?tab=moderation",
    label: "← Kiểm duyệt",
  });
});

test("post back target defaults to feed without router state", () => {
  assert.deepEqual(postBackTarget(null), { to: "/feed", label: "← Bảng tin" });
});

test("post back target ignores unknown origins", () => {
  assert.deepEqual(postBackTarget({ from: "/profile/1", tab: "moderation" }), {
    to: "/feed",
    label: "← Bảng tin",
  });
});
