// @source-path [fobles] tests/unit/jump-flyout/user-admin-page-settings.test.ts

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createUserAdminPageId,
  normalizeUserAdminPageIconPath,
  normalizeUserAdminPageUrl,
} from "../../../src/shared/jump-flyout/user-admin-page-settings.ts";
import { USER_ADMIN_PAGE } from "../../../src/shared/jump-flyout/jump-flyout.const.ts";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

void test("createUserAdminPageId returns a string", () => {
  assert.equal(typeof createUserAdminPageId(), "string");
});

void test("createUserAdminPageId returns a well-formed UUID", () => {
  assert.match(createUserAdminPageId(), UUID_PATTERN);
});

void test("createUserAdminPageId returns a different value on each call", () => {
  assert.notEqual(createUserAdminPageId(), createUserAdminPageId());
});

void test("USER_ADMIN_PAGE.DEFAULT_ICON_PATH is a non-empty string", () => {
  assert.ok(USER_ADMIN_PAGE.DEFAULT_ICON_PATH.length > 0);
});

void test("normalizeUserAdminPageIconPath falls back to USER_ADMIN_PAGE.DEFAULT_ICON_PATH for empty input", () => {
  assert.equal(normalizeUserAdminPageIconPath(""), `/-/icon/${USER_ADMIN_PAGE.DEFAULT_ICON_PATH}`);
});

void test("normalizeUserAdminPageIconPath re-normalizes an already-prefixed path", () => {
  assert.equal(normalizeUserAdminPageIconPath("/-/icon/custom/path.png"), "/-/icon/custom/path.png");
});

void test("normalizeUserAdminPageIconPath normalizes a bare custom path", () => {
  assert.equal(normalizeUserAdminPageIconPath("custom/path.png"), "/-/icon/custom/path.png");
});

void test("normalizeUserAdminPageUrl returns an empty string for empty input", () => {
  assert.equal(normalizeUserAdminPageUrl(""), "");
});

void test("normalizeUserAdminPageUrl returns an empty string for whitespace-only input", () => {
  assert.equal(normalizeUserAdminPageUrl("   "), "");
});

void test("normalizeUserAdminPageUrl adds a single leading slash when missing", () => {
  assert.equal(normalizeUserAdminPageUrl("unicorn.aspx"), "/unicorn.aspx");
});

void test("normalizeUserAdminPageUrl leaves an already-rooted url unchanged", () => {
  assert.equal(normalizeUserAdminPageUrl("/unicorn.aspx"), "/unicorn.aspx");
});

void test("normalizeUserAdminPageUrl collapses multiple leading slashes to one", () => {
  assert.equal(normalizeUserAdminPageUrl("///unicorn.aspx"), "/unicorn.aspx");
});

void test("normalizeUserAdminPageUrl preserves a query string", () => {
  assert.equal(normalizeUserAdminPageUrl("/foo.aspx?x=1"), "/foo.aspx?x=1");
});

void test("normalizeUserAdminPageUrl trims surrounding whitespace before normalizing", () => {
  assert.equal(normalizeUserAdminPageUrl("  unicorn.aspx  "), "/unicorn.aspx");
});

void test("normalizeUserAdminPageUrl returns an empty string for slashes-only input", () => {
  assert.equal(normalizeUserAdminPageUrl("///"), "");
});
