// @source-path [fobles] tests/unit/item-history/item-history-model.test.ts

import assert from "node:assert/strict";
import { test } from "node:test";
import {
  classifyHistoryPath,
  historyStorageKey,
  normalizeHistoryChange,
  normalizeHistoryId,
  normalizeHistoryItems,
  normalizeHistoryScope,
  upsertHistoryItem,
} from "../../../src/shared/item-history/item-history-model.ts";
import type { HistoryItem } from "../../../src/shared/item-history/item-history.types.ts";

const ID = "aabbccdd-1234-5678-90ab-abcdef123456";

function item(index: number, time = index): HistoryItem {
  return {
    id: `00000000-0000-0000-0000-${index.toString(16).padStart(12, "0")}`,
    name: `Item ${index}`,
    path: `/sitecore/content/Item ${index}`,
    category: "Content",
    lastVisitedAt: time,
  };
}

void test("GUID spellings normalize to lowercase dashed IDs without braces", () => {
  for (const value of [ID, ID.toUpperCase(), `{${ID.toUpperCase()}}`, ID.replace(/-/g, ""), ` {${ID.replace(/-/g, "")}} `]) {
    assert.equal(normalizeHistoryId(value), ID);
  }
  for (const value of [undefined, null, 12, "", "not-guid", `{${ID}`, `${ID}}`, ID.replace("-", ""), `${ID}0`]) {
    assert.equal(normalizeHistoryId(value), undefined);
  }
});

void test("classification matches roots and descendants case-insensitively with segment boundaries", () => {
  const cases = [
    ["/sitecore/templates", "Templates"],
    [" /SITECORE/Templates/Example/ ", "Templates"],
    ["/sitecore/layout", "Layouts"],
    ["/SITECORE/LAYOUT/Renderings/Card", "Layouts"],
    ["/sitecore/system/modules/PowerShell", "PowerShell"],
    ["/SITECORE/SYSTEM/MODULES/POWERSHELL/Script Library/Test", "PowerShell"],
    ["/sitecore/templates-extra/Test", "Content"],
    ["/sitecore/layouts/Test", "Content"],
    ["/sitecore/layout-extra/Test", "Content"],
    ["/sitecore/system/modules/PowerShell-extra/Test", "Content"],
    ["/sitecore/content/templates/Test", "Content"],
    ["/sitecore/content/Home", "Content"],
  ];
  for (const [path, category] of cases) {
    assert.equal(classifyHistoryPath(path), category, path);
  }
});

void test("normalization sorts and deduplicates GUID variants using newest complete metadata", () => {
  const old = { id: `{${ID.toUpperCase()}}`, name: "Old", path: "/sitecore/content/Old", category: "Content", lastVisitedAt: 1 };
  const newest = { ...old, id: ID.replace(/-/g, ""), name: " New ", path: " /sitecore//templates/New/ ", category: "templates", lastVisitedAt: 9 };
  assert.deepEqual(normalizeHistoryItems([old, item(2, 5), newest]), [
    { id: ID, name: "New", path: "/sitecore/templates/New", category: "Templates", lastVisitedAt: 9 },
    item(2, 5),
  ]);
  assert.deepEqual(normalizeHistoryItems([newest, old])[0], normalizeHistoryItems([old, newest])[0]);
});

void test("normalization validates unknown rows and derives category from canonical path", () => {
  assert.deepEqual(normalizeHistoryItems(null), []);
  assert.deepEqual(normalizeHistoryItems({}), []);
  const valid = item(1);
  const invalid = [null, [], {}, { ...valid, id: "bad" }, { ...valid, name: " " },
    { ...valid, path: "/sitecore-extra/content" }, { ...valid, path: "/sitecore/content/../Home" },
    { ...valid, category: "Unknown" }, { ...valid, lastVisitedAt: "1" },
    { ...valid, lastVisitedAt: NaN }, { ...valid, lastVisitedAt: Infinity }, { ...valid, lastVisitedAt: -1 }];
  assert.deepEqual(normalizeHistoryItems([...invalid, valid]), [valid]);
  assert.equal(normalizeHistoryItems([{ ...valid, path: "/sitecore/layout/Test" }])[0].category, "Layouts");
  assert.equal(normalizeHistoryItems([{ ...valid, path: "\\sitecore\\content\\Home\\" }])[0].path, "/sitecore/content/Home");
});

void test("normalization deduplicates before applying the newest-20 limit", () => {
  const entries = Array.from({ length: 25 }, (_, index) => item(index));
  const result = normalizeHistoryItems([...entries, { ...item(24), name: "Newest", lastVisitedAt: 99 }]);
  assert.equal(result.length, 20);
  assert.equal(result[0].name, "Newest");
  assert.equal(result[19].id, item(5).id);
});

void test("upsert moves revisits to the front, updates metadata and never mutates input", () => {
  const history = [item(2, 20), item(1, 10)];
  const snapshot = structuredClone(history);
  const result = upsertHistoryItem(history, {
    id: `{${item(1).id}}`, name: " Renamed ", path: "/sitecore/templates/Renamed/",
  }, 30);
  assert.deepEqual(result, [
    { id: item(1).id, name: "Renamed", path: "/sitecore/templates/Renamed", category: "Templates", lastVisitedAt: 30 },
    item(2, 20),
  ]);
  assert.deepEqual(history, snapshot);
  assert.throws(() => upsertHistoryItem(history, item(3), NaN), TypeError);
  assert.throws(() => upsertHistoryItem(history, { ...item(3), id: "bad" }, 30), TypeError);
});

void test("upsert trims to 20 and adds a new visit even at an equal timestamp", () => {
  const history = normalizeHistoryItems(Array.from({ length: 20 }, (_, index) => item(index, 50)));
  const result = upsertHistoryItem(history, item(99), 50);
  assert.equal(result.length, 20);
  assert.equal(result[0].id, item(99).id);
  assert.equal(result[result.length - 1].id, item(18).id);
});

void test("scope keys normalize origin/database and ignore paths, query languages and extra language fields", () => {
  const scope = { origin: " HTTPS://EXAMPLE.COM:8443/sitecore?sc_lang=en ", database: " Master ", language: "en" };
  assert.deepEqual(normalizeHistoryScope(scope), { origin: "https://example.com:8443", database: "master" });
  const key = historyStorageKey(scope);
  const otherLanguage = { ...scope, origin: "https://example.com:8443/other?sc_lang=fr", language: "fr" };
  assert.equal(key, historyStorageKey(otherLanguage));
  assert.equal(historyStorageKey({ origin: "https://example.com:443", database: "MASTER" }),
    historyStorageKey({ origin: "https://example.com", database: "master" }));
  for (const other of [
    { origin: "https://example.com", database: "master" },
    { origin: "https://example.com:8444", database: "master" },
    { origin: "http://example.com:8443", database: "master" },
    { origin: "https://other.example.com:8443", database: "master" },
    { origin: "https://example.com:8443", database: "web" },
  ]) {
    assert.notEqual(key, historyStorageKey(other));
  }
  for (const invalid of [null, {}, { origin: "not-url", database: "master" },
    { origin: "file:///tmp", database: "master" }, { origin: "https://example.com", database: " " }]) {
    assert.throws(() => normalizeHistoryScope(invalid));
  }
});

void test("change normalization validates actions and strips caller timestamps", () => {
  assert.deepEqual(normalizeHistoryChange({ action: "visit", visit: item(1), time: 999 }), {
    action: "visit", visit: { id: item(1).id, name: item(1).name, path: item(1).path },
  });
  assert.deepEqual(normalizeHistoryChange({ action: "remove", id: `{${ID.toUpperCase()}}` }), { action: "remove", id: ID });
  assert.deepEqual(normalizeHistoryChange({ action: "clear", time: 999 }), { action: "clear" });
  for (const invalid of [null, {}, { action: "other" }, { action: "remove", id: "bad" }, { action: "visit", visit: {} }]) {
    assert.throws(() => normalizeHistoryChange(invalid), TypeError);
  }
});