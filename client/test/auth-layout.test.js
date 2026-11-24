import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const app = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../src/auth.css", import.meta.url), "utf8");

test("auth form places the registration hint below password and provides field placeholders", () => {
  assert.match(app, /placeholder="Nhập họ và tên"/);
  assert.match(app, /placeholder="you@example\.com"/);
  assert.match(app, /placeholder=\{activeTab === "register" \? "Tạo mật khẩu" : "Mật khẩu"\}/);
  assert.match(app, /placeholder="Nhập lại mật khẩu"/);
  assert.match(app, /className="ridge-auth-password"[\s\S]*?className="ridge-auth-hint"[\s\S]*?auth-confirm-password/);
  assert.doesNotMatch(app, /auth-email[^\n]*ridge-auth-hint/);
});

test("auth logo and compact layout use theme tokens and fit the registration card", () => {
  assert.match(styles, /\.ridge-auth-mark\s*\{[^}]*background:\s*var\(--news-accent/);
  assert.match(styles, /\.ridge-auth-hint\s*\{[^}]*color:\s*var\(--news-muted/);
  assert.match(styles, /\.ridge-auth-form\s*\{[^}]*gap:\s*10px/);
  assert.match(styles, /\.ridge-auth-field input\s*\{[^}]*min-height:\s*44px/);
});
