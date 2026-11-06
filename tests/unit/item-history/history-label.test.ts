import assert from "node:assert/strict";
import { test } from "node:test";
import { historyItemLabel } from "../../../src/content/toolbar/history/history-label.ts";
import { ITEM, SITE } from "./history-sites-test.const.ts";

void test("Content labels expose unresolved Sites without rewriting real item names", () => {
  const item = { ...ITEM, name: "Real: Item Name" };
  assert.equal(historyItemLabel(item, []), "(unknown): Real: Item Name");
  assert.equal(historyItemLabel(item, [SITE]), "Alpha: Real: Item Name");
  assert.equal(historyItemLabel(item, [{ ...SITE, path: `${SITE.path}Other` }]), "(unknown): Real: Item Name");
  assert.equal(item.name, "Real: Item Name");
});

void test("non-Content categories never gain known or unknown Site prefixes", () => {
  for (const category of ["Templates", "Layouts", "PowerShell"] as const) {
    const item = { ...ITEM, category };
    assert.equal(historyItemLabel(item, []), item.name);
    assert.equal(historyItemLabel(item, [SITE]), item.name);
  }
});

void test("Content catch-all paths outside the content tree never gain an unknown Site prefix", () => {
  for (const path of ["/sitecore", "/sitecore/system/Settings", "/sitecore/media library/Image", "/sitecore/contentOther/Item"]) {
    const item = { ...ITEM, path };
    assert.equal(historyItemLabel(item, []), item.name);
    assert.equal(historyItemLabel(item, [SITE]), item.name);
  }
  assert.equal(historyItemLabel({ ...ITEM, path: "/SITECORE/CONTENT/Unresolved/Item" }, []), `(unknown): ${ITEM.name}`);
});