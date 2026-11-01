// @source-path [fobles] tests/unit/jump-flyout/button-settings.test.ts

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  joinJumpFlyoutPath,
  normalizeJumpFlyoutIconPath,
  sanitizeJumpFlyoutPathSuffix,
} from "../../../src/shared/jump-flyout/button-settings.ts";

const DEFAULT_ICON = "imaging/32x32/line_bezier_green_h.png";

void test("normalizeJumpFlyoutIconPath strips the '/-/icon/' prefix and reapplies it", () => {
  assert.equal(normalizeJumpFlyoutIconPath("/-/icon/foo/bar.png", DEFAULT_ICON), "/-/icon/foo/bar.png");
});

void test("normalizeJumpFlyoutIconPath strips a '-/icon/' prefix with no leading slash", () => {
  assert.equal(normalizeJumpFlyoutIconPath("-/icon/foo.png", DEFAULT_ICON), "/-/icon/foo.png");
});

void test("normalizeJumpFlyoutIconPath strips a '/~/icon/' prefix and still reapplies the '-' convention", () => {
  assert.equal(normalizeJumpFlyoutIconPath("/~/icon/bar.png", DEFAULT_ICON), "/-/icon/bar.png");
});

void test("normalizeJumpFlyoutIconPath strips a '~/icon/' prefix with no leading slash", () => {
  assert.equal(normalizeJumpFlyoutIconPath("~/icon/bar.png", DEFAULT_ICON), "/-/icon/bar.png");
});

void test("normalizeJumpFlyoutIconPath matches the known prefix case-insensitively", () => {
  assert.equal(normalizeJumpFlyoutIconPath("/-/ICON/Foo.png", DEFAULT_ICON), "/-/icon/Foo.png");
});

void test("normalizeJumpFlyoutIconPath collapses an extra slash left after stripping the prefix", () => {
  assert.equal(normalizeJumpFlyoutIconPath("/-/icon//foo.png", DEFAULT_ICON), "/-/icon/foo.png");
});

void test("normalizeJumpFlyoutIconPath falls back to the default icon path for an empty string", () => {
  assert.equal(normalizeJumpFlyoutIconPath("", DEFAULT_ICON), `/-/icon/${DEFAULT_ICON}`);
});

void test("normalizeJumpFlyoutIconPath falls back to the default icon path for whitespace-only input", () => {
  assert.equal(normalizeJumpFlyoutIconPath("   ", DEFAULT_ICON), `/-/icon/${DEFAULT_ICON}`);
});

void test("normalizeJumpFlyoutIconPath trims surrounding whitespace before matching the prefix", () => {
  assert.equal(normalizeJumpFlyoutIconPath("  /-/icon/foo.png  ", DEFAULT_ICON), "/-/icon/foo.png");
});

void test("normalizeJumpFlyoutIconPath does not strip a prefix that isn't anchored at the start", () => {
  assert.equal(
    normalizeJumpFlyoutIconPath("something/-/icon/foo.png", DEFAULT_ICON),
    "/-/icon/something/-/icon/foo.png",
  );
});

void test("normalizeJumpFlyoutIconPath keeps a plain relative path with no recognized prefix", () => {
  assert.equal(normalizeJumpFlyoutIconPath("subfolder/nested/icon.png", DEFAULT_ICON), "/-/icon/subfolder/nested/icon.png");
});

void test("normalizeJumpFlyoutIconPath strips unrecognized leading slashes with no known prefix", () => {
  assert.equal(normalizeJumpFlyoutIconPath("///foo.png", DEFAULT_ICON), "/-/icon/foo.png");
});

void test("sanitizeJumpFlyoutPathSuffix removes invalid filename characters", () => {
  assert.equal(sanitizeJumpFlyoutPathSuffix("C:\\Temp\\file?.txt"), "CTempfiletxt");
});

void test("sanitizeJumpFlyoutPathSuffix keeps spaces, which are not invalid characters", () => {
  assert.equal(sanitizeJumpFlyoutPathSuffix("My Script"), "My Script");
});

void test("sanitizeJumpFlyoutPathSuffix keeps a well-formed multi-segment path unchanged", () => {
  assert.equal(sanitizeJumpFlyoutPathSuffix("a/b/c"), "a/b/c");
});

void test("sanitizeJumpFlyoutPathSuffix collapses an empty segment from a double slash", () => {
  assert.equal(sanitizeJumpFlyoutPathSuffix("a//b"), "a/b");
});

void test("sanitizeJumpFlyoutPathSuffix trims whitespace around each segment", () => {
  assert.equal(sanitizeJumpFlyoutPathSuffix("  a / b  "), "a/b");
});

void test("sanitizeJumpFlyoutPathSuffix returns an empty string for empty input", () => {
  assert.equal(sanitizeJumpFlyoutPathSuffix(""), "");
});

void test("sanitizeJumpFlyoutPathSuffix returns an empty string when every character is invalid", () => {
  assert.equal(sanitizeJumpFlyoutPathSuffix("...:::???"), "");
});

void test("sanitizeJumpFlyoutPathSuffix removes invalid characters before splitting into segments", () => {
  assert.equal(sanitizeJumpFlyoutPathSuffix("a/./b"), "a/b");
});

void test("sanitizeJumpFlyoutPathSuffix drops leading and trailing slashes via empty-segment filtering", () => {
  assert.equal(sanitizeJumpFlyoutPathSuffix("/a/b/"), "a/b");
});

void test("joinJumpFlyoutPath returns the base path unchanged for an empty suffix", () => {
  assert.equal(joinJumpFlyoutPath("/sitecore", ""), "/sitecore");
});

void test("joinJumpFlyoutPath returns the base path unchanged for a whitespace-only suffix", () => {
  assert.equal(joinJumpFlyoutPath("/sitecore", "   "), "/sitecore");
});

void test("joinJumpFlyoutPath appends a simple suffix as a new path segment", () => {
  assert.equal(joinJumpFlyoutPath("/sitecore", "My Reports"), "/sitecore/My Reports");
});

void test("joinJumpFlyoutPath drops a suffix's first segment when it duplicates the base path's last segment", () => {
  assert.equal(
    joinJumpFlyoutPath("/sitecore/system/Modules/PowerShell/Script Library", "Script Library/Foo"),
    "/sitecore/system/Modules/PowerShell/Script Library/Foo",
  );
});

void test("joinJumpFlyoutPath dedup check is case-insensitive", () => {
  assert.equal(
    joinJumpFlyoutPath("/sitecore/system/Modules/PowerShell/Script Library", "SCRIPT LIBRARY/Foo"),
    "/sitecore/system/Modules/PowerShell/Script Library/Foo",
  );
});

void test("joinJumpFlyoutPath dedups against a single-segment base path too", () => {
  assert.equal(joinJumpFlyoutPath("/sitecore", "sitecore/content"), "/sitecore/content");
});

void test("joinJumpFlyoutPath only dedups the suffix's first segment, not a nested repeat", () => {
  assert.equal(joinJumpFlyoutPath("/sitecore", "Content/sitecore"), "/sitecore/Content/sitecore");
});

void test("joinJumpFlyoutPath sanitizes the suffix (invalid characters) before joining", () => {
  assert.equal(joinJumpFlyoutPath("/sitecore", "Reports/Q1?.csv"), "/sitecore/Reports/Q1csv");
});

void test("joinJumpFlyoutPath returns the base path unchanged when the suffix is entirely invalid characters", () => {
  assert.equal(joinJumpFlyoutPath("/sitecore", "???"), "/sitecore");
});

void test("joinJumpFlyoutPath preserves a multi-segment suffix with no dedup match", () => {
  assert.equal(joinJumpFlyoutPath("/sitecore/content", "Home/Child Page"), "/sitecore/content/Home/Child Page");
});
