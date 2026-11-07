import assert from "node:assert/strict";
import { test } from "node:test";
import { SITECORE } from "../../../src/constants/sitecore.ts";
import { knownSitesStorageKey, matchKnownSite, normalizeKnownSite, normalizeKnownSites } from "../../../src/shared/known-sites/known-sites-model.ts";
import { normalizeStructuralSettings } from "../../../src/shared/structural/structural-settings.ts";
import { guid, SCOPE } from "./structural-fixture.ts";

void test("Known Sites scope is canonical origin/database, not language or URL path", () => {
  assert.equal(knownSitesStorageKey(SCOPE), knownSitesStorageKey({ origin: `${SCOPE.origin}/sitecore?sc_lang=da`, database: " MASTER " }));
  assert.notEqual(knownSitesStorageKey(SCOPE), knownSitesStorageKey({ ...SCOPE, database: "web" }));
  assert.notEqual(knownSitesStorageKey(SCOPE), knownSitesStorageKey({ ...SCOPE, origin: "https://sitecore.example" }));
  assert.throws(() => knownSitesStorageKey({ ...SCOPE, origin: "file:///tmp" }));
});

void test("minimum Site metadata normalizes GUIDs and strips history/membership/legacy fields", () => {
  const site = normalizeKnownSite({
    id: `{${guid(20).toUpperCase()}}`, name: " Site ", path: "/sitecore//content/Site/", templateId: `{${guid(2)}}`,
    validatedAt: 1, category: "Content", lastVisitedAt: 999, siteMemberships: [guid(20)], rawMarkup: "not persisted",
  });
  assert.deepEqual(site, { id: guid(20), name: "Site", path: "/sitecore/content/Site", templateId: guid(2), validatedAt: 1 });
  for (const bad of [
    { ...site, templateId: "bad" }, { ...site, id: "bad" }, { ...site, name: "" },
    { ...site, path: "/sitecore/content/../Site" }, { ...site, path: "/sitecore/templates/Site" },
    { ...site, validatedAt: Number.NaN }, { ...site, validatedAt: -1 },
  ]) {
    assert.throws(() => normalizeKnownSite(bad));
  }
});

void test("longest matching root wins only at a segment boundary", () => {
  const outer = { id: guid(20), name: "Site", path: "/sitecore/content/Site", templateId: guid(2), validatedAt: 1 };
  const inner = { ...outer, id: guid(21), path: `${outer.path}/Nested` };
  assert.equal(matchKnownSite([outer, inner], `${inner.path}/Home`)?.id, inner.id);
  assert.equal(matchKnownSite([outer, inner], `${inner.path}Other/Home`)?.id, outer.id);
  assert.equal(matchKnownSite([outer], `${outer.path}Other`), undefined);
  assert.equal(matchKnownSite([outer], outer.path.toUpperCase())?.id, outer.id);
});

void test("normalization preserves newest moved GUID metadata, drops invalid rows, and does not use History's 20-item cap", () => {
  const rows = Array.from({ length: 25 }, (_, index) => ({
    id: guid(index + 20), name: `Site ${index}`, path: `/sitecore/content/Site ${index}`, templateId: guid(2), validatedAt: 1,
  }));
  const moved = { ...rows[0], path: "/sitecore/content/Moved", name: "Moved", validatedAt: 2 };
  const sites = normalizeKnownSites([...rows, moved, { id: "bad" }]);
  assert.equal(sites.length, 25);
  assert.deepEqual(sites.find((site) => site.id === moved.id), moved);
});

void test("shared structural settings keep immutable classification roots and discard legacy overrides", () => {
  const defaults = normalizeStructuralSettings(undefined);
  assert.equal("maxAgeMs" in defaults, false);
  assert.deepEqual(defaults.baseTemplatePaths.site, SITECORE.ITEM_KIND.BASE_TEMPLATE_PATHS.SITE);
  const settings = normalizeStructuralSettings({
    maxAgeMs: -1,
    baseTemplatePaths: { page: [], site: ["/sitecore/templates/Custom"], tenant: [] },
  });
  assert.deepEqual(settings.baseTemplatePaths, defaults.baseTemplatePaths);
  assert.equal("maxAgeMs" in settings, false);
});
