import test from "node:test";
import assert from "node:assert/strict";
import { API_BASE, resolveMediaUrl } from "../src/lib/api.js";

test("API base and media URLs stay same-origin when VITE_API_URL is empty", () => {
  assert.equal(API_BASE, "");
  assert.equal(resolveMediaUrl("/uploads/a.jpg"), "/uploads/a.jpg");
  assert.equal(resolveMediaUrl("https://old-tunnel.example/uploads/a.mp4"), "/uploads/a.mp4");
  assert.equal(resolveMediaUrl("https://cdn.example/a.jpg"), "https://cdn.example/a.jpg");
  assert.equal(resolveMediaUrl(null), null);
  assert.equal(resolveMediaUrl(""), "");
});
