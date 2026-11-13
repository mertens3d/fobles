// @source-path [fobles] src/content/foundation/harvesting/collectors/section-collector/layout-collector/layout-collector.test.ts

import assert from "node:assert/strict";
import test from "node:test";
import { processLayoutXml } from "./layout-collector";

void test("malformed layout XML returns undefined", () => {
  assert.equal(processLayoutXml("<r><d>"), undefined);
});
void test("layout without device collection lacks r.d", () => {
  assert.equal(processLayoutXml("<r/>")?.r?.d, undefined);
});
void test("valid layout preserves device collection", () => {
  assert.equal(processLayoutXml('<r><d id="device"/></r>')?.r.d[0]?.id, "device");
});
