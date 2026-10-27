// @source-path [fobles] tests/unit/sitecore-data-cache/sitecore-data-cache-persistence.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { toPersistedValue } from "../../../src/content/foundation/cache/sitecore-data/sitecore-data-cache-persistence.ts";

const ENVIRONMENT = "https://xmc-sitecore31f55-gregorydemo7b6d-devff6b.sitecorecloud.io";
const ICON_PATH = "/temp/iconcache/powershell/32x32/powershell8.png?rev=940a1c3f-a8ea-4188-a548-895fd7e47866&la=en";

function item(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return { type: "scItem", scItemName: "Get-UniqueItem", scItemIcon: `${ENVIRONMENT}${ICON_PATH}`, rawMarkup: "<table>quick info</table>", ...overrides };
}

void test("rawMarkup is removed at every depth, including inside arrays", () => {
  const persisted = toPersistedValue({ result: { value: item({ scTemplate: item() }) }, childItems: [item(), item()] }, ENVIRONMENT);
  assert.equal(JSON.stringify(persisted).includes("rawMarkup"), false);
  assert.equal(JSON.stringify(persisted).includes("quick info"), false);
});

void test("the caller's runtime object is not mutated", () => {
  const original = { result: { value: item() } };
  const snapshot = JSON.stringify(original);
  toPersistedValue(original, ENVIRONMENT);
  assert.equal(JSON.stringify(original), snapshot);
  assert.equal(original.result.value.rawMarkup, "<table>quick info</table>");
});

void test("scItemIcon on the page origin becomes a relative URL, query string intact", () => {
  const persisted = toPersistedValue(item(), ENVIRONMENT);
  assert.equal(persisted.scItemIcon, ICON_PATH);
});

void test("origin match ignores case in the environment value", () => {
  assert.equal(toPersistedValue(item(), ENVIRONMENT.toUpperCase()).scItemIcon, ICON_PATH);
});

void test("scItemIcon on another origin is left alone", () => {
  const external = "https://other.example.io/icon.png";
  assert.equal(toPersistedValue(item({ scItemIcon: external }), ENVIRONMENT).scItemIcon, external);
});

void test("a look-alike host is not treated as the page origin", () => {
  const lookalike = `${ENVIRONMENT}.evil.example/icon.png`;
  assert.equal(toPersistedValue(item({ scItemIcon: lookalike }), ENVIRONMENT).scItemIcon, lookalike);
});

void test("an already relative scItemIcon is unchanged", () => {
  assert.equal(toPersistedValue(item({ scItemIcon: ICON_PATH }), ENVIRONMENT).scItemIcon, ICON_PATH);
});

void test("an undefined scItemIcon is unchanged", () => {
  assert.equal(toPersistedValue(item({ scItemIcon: undefined }), ENVIRONMENT).scItemIcon, undefined);
});

void test("other string properties containing the origin are never rewritten", () => {
  const value = { link: `${ENVIRONMENT}/sitecore/shell`, fields: [{ label: "Url", value: `${ENVIRONMENT}/home` }] };
  assert.deepEqual(toPersistedValue(value, ENVIRONMENT), value);
});

void test("a non-URL environment still strips rawMarkup and leaves URLs alone", () => {
  const persisted = toPersistedValue(item(), "DEV");
  assert.equal("rawMarkup" in persisted, false);
  assert.equal(persisted.scItemIcon, `${ENVIRONMENT}${ICON_PATH}`);
});

void test("primitives, null and empty containers pass through", () => {
  assert.equal(toPersistedValue(5, ENVIRONMENT), 5);
  assert.equal(toPersistedValue(null, ENVIRONMENT), null);
  assert.deepEqual(toPersistedValue({ referrers: [] }, ENVIRONMENT), { referrers: [] });
  assert.deepEqual(toPersistedValue({ parent: undefined }, ENVIRONMENT), { parent: undefined });
});

void test("the persisted copy is smaller than the runtime object", () => {
  const original = { result: { value: item({ rawMarkup: "x".repeat(2000) }) } };
  assert.ok(JSON.stringify(toPersistedValue(original, ENVIRONMENT)).length < JSON.stringify(original).length - 2000);
});
