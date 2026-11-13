// @source-path [fobles] tests/unit/jump-flyout/user-tree-jump-settings.test.ts

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildUserTreeJumpPath,
  createUserTreeJumpId,
  normalizeUserTreeJumpIconPath,
} from "../../../src/shared/jump-flyout/user-tree-jump-settings.ts";
import { USER_TREE_JUMP } from "../../../src/constants/user-tree-jump.const.ts";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

void test("createUserTreeJumpId returns a string", () => {
  assert.equal(typeof createUserTreeJumpId(), "string");
});

void test("createUserTreeJumpId returns a well-formed UUID", () => {
  assert.match(createUserTreeJumpId(), UUID_PATTERN);
});

void test("createUserTreeJumpId returns a different value on each call", () => {
  assert.notEqual(createUserTreeJumpId(), createUserTreeJumpId());
});

void test("USER_TREE_JUMP.DEFAULT_ICON_PATH is a non-empty string", () => {
  assert.ok(USER_TREE_JUMP.DEFAULT_ICON_PATH.length > 0);
});

void test("normalizeUserTreeJumpIconPath falls back to USER_TREE_JUMP.DEFAULT_ICON_PATH for empty input", () => {
  assert.equal(normalizeUserTreeJumpIconPath(""), `/-/icon/${USER_TREE_JUMP.DEFAULT_ICON_PATH}`);
});

void test("normalizeUserTreeJumpIconPath re-normalizes an already-prefixed path", () => {
  assert.equal(normalizeUserTreeJumpIconPath("/-/icon/custom/path.png"), "/-/icon/custom/path.png");
});

void test("normalizeUserTreeJumpIconPath normalizes a bare custom path", () => {
  assert.equal(normalizeUserTreeJumpIconPath("custom/path.png"), "/-/icon/custom/path.png");
});

void test("buildUserTreeJumpPath returns the root path for an empty suffix", () => {
  assert.equal(buildUserTreeJumpPath(""), "/sitecore");
});

void test("buildUserTreeJumpPath appends a simple suffix under the root", () => {
  assert.equal(buildUserTreeJumpPath("My Jump"), "/sitecore/My Jump");
});

void test("buildUserTreeJumpPath sanitizes invalid characters in the suffix", () => {
  assert.equal(buildUserTreeJumpPath("Reports/Q1?.csv"), "/sitecore/Reports/Q1csv");
});

void test("buildUserTreeJumpPath dedups a suffix that repeats the root's last segment", () => {
  assert.equal(buildUserTreeJumpPath("sitecore/content/Home"), "/sitecore/content/Home");
});

void test("buildUserTreeJumpPath dedup is case-insensitive", () => {
  assert.equal(buildUserTreeJumpPath("SITECORE/content"), "/sitecore/content");
});

void test("buildUserTreeJumpPath preserves a multi-segment suffix with no dedup match", () => {
  assert.equal(buildUserTreeJumpPath("content/Home/Child"), "/sitecore/content/Home/Child");
});

void test("buildUserTreeJumpPath returns the root path when the suffix is entirely invalid characters", () => {
  assert.equal(buildUserTreeJumpPath("???"), "/sitecore");
});

void test("buildUserTreeJumpPath trims and collapses slashes in the suffix", () => {
  assert.equal(buildUserTreeJumpPath("  /content/  "), "/sitecore/content");
});
