// @source-path [fobles] tests/unit/classification/classify-item.test.ts

import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyItem } from "../../../src/content/foundation/reference-data/processing/classification/classify-item.ts";
import type {
  BaseTemplateIdSets,
  ClassificationPathRoots,
} from "../../../src/content/foundation/reference-data/processing/classification/item-classification.types.ts";

const PATH_ROOTS: ClassificationPathRoots = { content: "/sitecore/content", templates: "/sitecore/templates" };
const PAGE_ID = "{11111111-1111-1111-1111-111111111111}";
const SITE_ID = "{22222222-2222-2222-2222-222222222222}";
const TENANT_ID = "{33333333-3333-3333-3333-333333333333}";
const OTHER_ID = "{44444444-4444-4444-4444-444444444444}";

function baseIds(
  overrides: Partial<{ page: readonly string[]; site: readonly string[]; tenant: readonly string[] }> = {},
): BaseTemplateIdSets {
  return {
    page: new Set(overrides.page ?? [PAGE_ID]),
    site: new Set(overrides.site ?? [SITE_ID]),
    tenant: new Set(overrides.tenant ?? [TENANT_ID]),
  };
}

void test("an item at or below /sitecore/templates classifies as template", () => {
  const result = classifyItem({
    itemPath: "/sitecore/templates/Project/Page",
    inheritedTemplateIds: [OTHER_ID],
    baseTemplateIds: baseIds(),
    pathRoots: PATH_ROOTS,
  });
  assert.equal(result.classification, "template");
});

void test("/sitecore/templates itself (the root) classifies as template", () => {
  const result = classifyItem({
    itemPath: "/sitecore/templates",
    inheritedTemplateIds: [],
    baseTemplateIds: baseIds(),
    pathRoots: PATH_ROOTS,
  });
  assert.equal(result.classification, "template");
});

void test("template classification takes precedence even if the path also matches a configured base id", () => {
  const result = classifyItem({
    itemPath: "/sitecore/templates/Foo",
    inheritedTemplateIds: [TENANT_ID],
    baseTemplateIds: baseIds(),
    pathRoots: PATH_ROOTS,
  });
  assert.equal(result.classification, "template");
});

void test("a content item whose immediate template directly matches the Page base classifies as page", () => {
  const result = classifyItem({
    itemPath: "/sitecore/content/Home",
    inheritedTemplateIds: [PAGE_ID],
    baseTemplateIds: baseIds(),
    pathRoots: PATH_ROOTS,
  });
  assert.equal(result.classification, "page");
});

void test("a content item whose template indirectly inherits the Page base classifies as page", () => {
  const result = classifyItem({
    itemPath: "/sitecore/content/Home",
    inheritedTemplateIds: [OTHER_ID, "{deep-intermediate}", PAGE_ID],
    baseTemplateIds: baseIds(),
    pathRoots: PATH_ROOTS,
  });
  assert.equal(result.classification, "page");
});

void test("a content item whose immediate template directly matches the Site base classifies as site", () => {
  const result = classifyItem({
    itemPath: "/sitecore/content/Home",
    inheritedTemplateIds: [SITE_ID],
    baseTemplateIds: baseIds(),
    pathRoots: PATH_ROOTS,
  });
  assert.equal(result.classification, "site");
});

void test("a content item whose template indirectly inherits the Site base classifies as site", () => {
  const result = classifyItem({
    itemPath: "/sitecore/content/Home",
    inheritedTemplateIds: [OTHER_ID, SITE_ID],
    baseTemplateIds: baseIds(),
    pathRoots: PATH_ROOTS,
  });
  assert.equal(result.classification, "site");
});

void test("a content item whose immediate template directly matches the Tenant base classifies as tenant", () => {
  const result = classifyItem({
    itemPath: "/sitecore/content/Home",
    inheritedTemplateIds: [TENANT_ID],
    baseTemplateIds: baseIds(),
    pathRoots: PATH_ROOTS,
  });
  assert.equal(result.classification, "tenant");
});

void test("a content item whose template indirectly inherits the Tenant base classifies as tenant", () => {
  const result = classifyItem({
    itemPath: "/sitecore/content/Home",
    inheritedTemplateIds: [OTHER_ID, TENANT_ID],
    baseTemplateIds: baseIds(),
    pathRoots: PATH_ROOTS,
  });
  assert.equal(result.classification, "tenant");
});

void test("no configured base template matched returns other", () => {
  const result = classifyItem({
    itemPath: "/sitecore/content/Home",
    inheritedTemplateIds: [OTHER_ID],
    baseTemplateIds: baseIds(),
    pathRoots: PATH_ROOTS,
  });
  assert.equal(result.classification, "other");
  assert.deepEqual(result.diagnostics.matchedBaseTemplateClassifications, []);
});

void test("a path outside both /sitecore/content and /sitecore/templates classifies as other", () => {
  const result = classifyItem({
    itemPath: "/sitecore/system/Settings",
    inheritedTemplateIds: [PAGE_ID],
    baseTemplateIds: baseIds(),
    pathRoots: PATH_ROOTS,
  });
  assert.equal(result.classification, "other");
});

void test("an undefined item path classifies as other", () => {
  const result = classifyItem({
    itemPath: undefined,
    inheritedTemplateIds: [PAGE_ID],
    baseTemplateIds: baseIds(),
    pathRoots: PATH_ROOTS,
  });
  assert.equal(result.classification, "other");
});

void test("overlap between Tenant and Site bases uses precedence (Tenant wins) and records both matches", () => {
  const result = classifyItem({
    itemPath: "/sitecore/content/Home",
    inheritedTemplateIds: [SITE_ID, TENANT_ID],
    baseTemplateIds: baseIds(),
    pathRoots: PATH_ROOTS,
  });
  assert.equal(result.classification, "tenant");
  assert.deepEqual([...result.diagnostics.matchedBaseTemplateClassifications].sort(), ["site", "tenant"]);
});

void test("overlap between Site and Page bases uses precedence (Site wins)", () => {
  const result = classifyItem({
    itemPath: "/sitecore/content/Home",
    inheritedTemplateIds: [PAGE_ID, SITE_ID],
    baseTemplateIds: baseIds(),
    pathRoots: PATH_ROOTS,
  });
  assert.equal(result.classification, "site");
});

void test("classification is always exactly one of the five mutually exclusive values", () => {
  const result = classifyItem({
    itemPath: "/sitecore/content/Home",
    inheritedTemplateIds: [PAGE_ID, SITE_ID, TENANT_ID],
    baseTemplateIds: baseIds(),
    pathRoots: PATH_ROOTS,
  });
  assert.ok(["template", "tenant", "site", "page", "other"].includes(result.classification));
  assert.equal(typeof result.classification, "string");
});

void test("GUID brace/casing differences between inherited ids and configured ids still match", () => {
  const result = classifyItem({
    itemPath: "/sitecore/content/Home",
    inheritedTemplateIds: ["11111111-1111-1111-1111-111111111111"],
    baseTemplateIds: baseIds(),
    pathRoots: PATH_ROOTS,
  });
  assert.equal(result.classification, "page");
});
