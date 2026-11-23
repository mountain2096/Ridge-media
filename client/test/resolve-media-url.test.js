import test from "node:test";
import assert from "node:assert/strict";
import { resolveMediaUrl } from "../src/lib/api.js";

test("resolveMediaUrl rewrites relative and legacy uploads to the configured API", () => {
  assert.equal(resolveMediaUrl("/uploads/a.jpg"), "http://localhost:5000/uploads/a.jpg");
  assert.equal(resolveMediaUrl("https://old-tunnel.example/uploads/a.mp4"), "http://localhost:5000/uploads/a.mp4");
  assert.equal(resolveMediaUrl("https://cdn.example/a.jpg"), "https://cdn.example/a.jpg");
  assert.equal(resolveMediaUrl(null), null);
  assert.equal(resolveMediaUrl(""), "");
});
