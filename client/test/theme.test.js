import test from "node:test";
import assert from "node:assert/strict";
import { setTheme } from "../src/lib/theme.js";

test("setTheme persists the choice and updates the document theme", () => {
  const previousDocument = globalThis.document;
  const previousStorage = globalThis.localStorage;
  const values = new Map();
  globalThis.document = { documentElement: { dataset: {} } };
  globalThis.localStorage = { setItem: (key, value) => values.set(key, value) };
  try {
    setTheme("dark");
    assert.equal(document.documentElement.dataset.theme, "dark");
    assert.equal(values.get("ridge-theme"), "dark");
  } finally {
    globalThis.document = previousDocument;
    globalThis.localStorage = previousStorage;
  }
});
