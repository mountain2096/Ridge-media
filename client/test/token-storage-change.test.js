import test from "node:test";
import assert from "node:assert/strict";
import { getTokenStorageAction } from "../src/lib/tokenStorageChange.js";

test("token storage changes choose reload, notice, logout, or ignore", () => {
  assert.equal(getTokenStorageAction({ key: "token", oldValue: "old", newValue: null }, true), "logout");
  assert.equal(getTokenStorageAction({ key: "token", oldValue: "old", newValue: "new" }, false), "reload");
  assert.equal(getTokenStorageAction({ key: "token", oldValue: null, newValue: "new" }, false), "reload");
  assert.equal(getTokenStorageAction({ key: "token", oldValue: "same", newValue: "same" }, false), "ignore");
  assert.equal(getTokenStorageAction({ key: "theme", oldValue: "light", newValue: "dark" }, false), "ignore");
  assert.equal(getTokenStorageAction({ key: "token", oldValue: "old", newValue: "new" }, true), "notice");
});
