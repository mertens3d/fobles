// @source-path [fobles] tests/unit/shared/path-helpers.test.ts

import { test } from "node:test";
import assert from "node:assert/strict";
import { getParentPath } from "../../../src/shared/path-helpers.ts";

void test("getParentPath returns undefined for undefined input", () => {
  assert.equal(getParentPath(undefined), undefined);
});

void test("getParentPath returns undefined for an empty string", () => {
  assert.equal(getParentPath(""), undefined);
});

void test("getParentPath returns undefined for a single-segment path", () => {
  assert.equal(getParentPath("/sitecore"), undefined);
});

void test("getParentPath drops the last segment of a two-segment path", () => {
  assert.equal(getParentPath("/sitecore/content"), "/sitecore");
});

void test("getParentPath drops the last segment of a deep path", () => {
  assert.equal(getParentPath("/sitecore/content/Home/Child"), "/sitecore/content/Home");
});

void test("getParentPath ignores a trailing slash, which contributes no extra segment", () => {
  assert.equal(getParentPath("/sitecore/content/"), "/sitecore");
});

void test("getParentPath always returns a leading-slash path, even without one in the input", () => {
  assert.equal(getParentPath("sitecore/content"), "/sitecore");
});

void test("getParentPath collapses a double slash to a single empty-segment gap", () => {
  assert.equal(getParentPath("/sitecore//content"), "/sitecore");
});

void test("getParentPath returns undefined for a root-only '/' path", () => {
  assert.equal(getParentPath("/"), undefined);
});

void test("getParentPath does not trim a whitespace-only segment", () => {
  assert.equal(getParentPath("/sitecore/ /content"), "/sitecore/ ");
});
