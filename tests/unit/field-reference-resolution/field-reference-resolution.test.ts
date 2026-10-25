// @source-path [fobles] tests/unit/field-reference-resolution/field-reference-resolution.test.ts

import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveFieldReferences } from "../../../src/content/field-reference-resolution/field-reference-resolution.ts";
import { resolveDropLinkReferences } from "../../../src/content/field-reference-resolution/field-reference-resolvers.ts";

const SHARED_REVISION_GUID = "23002d47-b496-45d4-9211-f1d56c398588";
const REVISION_GUID = "ac6ee4d5-5f9a-4c7e-9a9c-5a5031b2f772";

// No resolver strategy ever claims a plain revision/statistics field - querySelector/
// querySelectorAll returning nothing for every selector mirrors that "no known markup" reality
// without needing a real DOM.
function noStrategyMarker(): HTMLElement {
  return { querySelector: () => null, querySelectorAll: () => [] } as unknown as HTMLElement;
}

void test("Revision GUID does not produce a Reference Model item node", () => {
  const resolution = resolveFieldReferences(noStrategyMarker(), REVISION_GUID, "Revision");
  assert.deepEqual(resolution.references, []);
});

void test("Shared revision GUID does not produce a Reference Model item node", () => {
  const resolution = resolveFieldReferences(noStrategyMarker(), SHARED_REVISION_GUID, "Shared revision");
  assert.deepEqual(resolution.references, []);
});

void test("Unversioned revision GUID does not produce a Reference Model item node", () => {
  const resolution = resolveFieldReferences(noStrategyMarker(), SHARED_REVISION_GUID, "Unversioned revision");
  assert.deepEqual(resolution.references, []);
});

void test("the revision-label exclusion is case/whitespace-insensitive", () => {
  const resolution = resolveFieldReferences(noStrategyMarker(), REVISION_GUID, "  REVISION  ");
  assert.deepEqual(resolution.references, []);
});

void test("a genuine GUID-valued field with no matching strategy is still inferred as a reference", () => {
  const resolution = resolveFieldReferences(noStrategyMarker(), REVISION_GUID, "Some Custom Reference Field");
  assert.equal(resolution.references.length, 1);
  assert.equal(resolution.references[0]?.confidence, "inferred");
  assert.equal(resolution.references[0]?.target, REVISION_GUID);
});

void test("explicit reference-field strategies (e.g. droplink) are unaffected by field label", () => {
  const selectedOption = { value: REVISION_GUID, textContent: "Home" };
  const fakeSelect = { options: [selectedOption], selectedIndex: 0 };
  const marker = {
    querySelector: (selector: string) => (selector.includes("scCombobox") ? fakeSelect : null),
  } as unknown as HTMLElement;

  // Even with the "Revision" label, a real droplink strategy match must still win and resolve.
  const references = resolveDropLinkReferences(marker);
  assert.equal(references?.length, 1);
  assert.equal(references?.[0]?.confidence, "strategy");
  assert.equal(references?.[0]?.strategy, "drop-link");
  assert.equal(references?.[0]?.target, REVISION_GUID);
});

void test("resolveFieldReferences prefers a known strategy over the revision-label exclusion", () => {
  const selectedOption = { value: REVISION_GUID, textContent: "Home" };
  const fakeSelect = { options: [selectedOption], selectedIndex: 0 };
  const marker = {
    querySelector: (selector: string) => (selector.includes("scCombobox") ? fakeSelect : null),
  } as unknown as HTMLElement;

  const resolution = resolveFieldReferences(marker, REVISION_GUID, "Revision");
  assert.equal(resolution.references.length, 1);
  assert.equal(resolution.references[0]?.confidence, "strategy");
});
