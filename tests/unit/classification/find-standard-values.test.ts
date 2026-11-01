// @source-path [fobles] tests/unit/classification/find-standard-values.test.ts

import { test } from "node:test";
import assert from "node:assert/strict";
import { findStandardValues } from "../../../src/content/foundation/reference-data/processing/classification/find-standard-values.ts";

void test("finds the child item named exactly '__Standard Values'", () => {
  const children = [{ scItemName: "Home" }, { scItemName: "__Standard Values" }, { scItemName: "Data" }];
  assert.equal(findStandardValues(children)?.scItemName, "__Standard Values");
});

void test("returns undefined when no child is named '__Standard Values'", () => {
  const children = [{ scItemName: "Home" }, { scItemName: "Data" }];
  assert.equal(findStandardValues(children), undefined);
});

void test("returns undefined for an empty children array", () => {
  assert.equal(findStandardValues([]), undefined);
});

void test("a differently-cased name is not treated as a match", () => {
  const children = [{ scItemName: "__standard values" }];
  assert.equal(findStandardValues(children), undefined);
});

void test("picks the correct item among several non-matching siblings", () => {
  const children = [{ scItemName: "A" }, { scItemName: "B" }, { scItemName: "__Standard Values" }, { scItemName: "C" }];
  const found = findStandardValues(children);
  assert.equal(found?.scItemName, "__Standard Values");
});
