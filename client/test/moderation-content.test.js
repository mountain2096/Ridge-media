import test from "node:test";
import assert from "node:assert/strict";
import { moderationContentPath } from "../src/lib/moderationContent.js";

test("moderation links open posts and comments at their reported location", () => {
  assert.equal(moderationContentPath({ targetType: "post", targetId: "p1", target: { available: true } }), "/post/p1");
  assert.equal(moderationContentPath({ targetType: "comment", targetId: "c1", target: { available: true, postId: "p1" } }), "/post/p1?comment=c1");
  assert.equal(moderationContentPath({ targetType: "post", targetId: "p1", target: { available: false } }), null);
});
