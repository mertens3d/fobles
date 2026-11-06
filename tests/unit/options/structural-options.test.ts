import assert from "node:assert/strict";
import { test } from "node:test";
import { knownSitesStorageKey } from "../../../src/shared/known-sites/known-sites-model.ts";
import { normalizeStructuralSettings } from "../../../src/shared/structural/structural-settings.ts";
import { STRUCTURAL_OPTIONS } from "../../../src/options/structural/structural-options.const.ts";
import { knownSiteScopes, parseStructuralSettingsDraft, structuralError, structuralSettingsDraft } from "../../../src/options/structural/structural-options-model.ts";

void test("structural Options use Site discovery copy and explain internal scope errors", () => {
  assert.equal(STRUCTURAL_OPTIONS.TITLE, "Site discovery");
  assert.equal(STRUCTURAL_OPTIONS.SAVE_LABEL, "Save site discovery settings");
  assert.equal(STRUCTURAL_OPTIONS.SAVED, "Site discovery settings saved.");
  assert.equal(structuralError(new Error("No Content Editor for this scope.")), "No Content Editor for this Sitecore environment and database.");
  assert.equal(structuralError(new Error("Storage unavailable.")), "Storage unavailable.");
  assert.equal(structuralError(undefined), "Structural operation failed.");
});

void test("structural Options round-trip defaults without runtime cache tuning", () => {
  const defaults = normalizeStructuralSettings(undefined);
  const draft = structuralSettingsDraft(defaults);
  assert.equal("ageDays" in draft, false);
  assert.deepEqual(Object.keys(draft).sort(), ["paths", "showToolbarDiagnostics"]);
  assert.equal(draft.showToolbarDiagnostics, false);
  assert.equal(parseStructuralSettingsDraft({ ...draft, showToolbarDiagnostics: true }).showToolbarDiagnostics, true);
  assert.equal("maxAgeMs" in defaults, false);
  assert.deepEqual(parseStructuralSettingsDraft(draft), defaults);
});

void test("structural Options normalize line-separated paths and preserve explicit empty categories", () => {
  const draft = {
    paths: { page: " /sitecore/templates/Feature//Page/ \r\n/sitecore/templates/Feature/Page", site: "", tenant: "  \n" },
    showToolbarDiagnostics: false,
  };
  assert.deepEqual(parseStructuralSettingsDraft(draft).baseTemplatePaths, {
    page: ["/sitecore/templates/Feature/Page"], site: [], tenant: [],
  });
  for (const path of ["/sitecore/content/Page", "/sitecore/templates", "/sitecore/templates/../Page", "/sitecore/templates/Page\u0000"]) {
    assert.throws(() => parseStructuralSettingsDraft({ ...draft, paths: { ...draft.paths, page: path } }), { message: STRUCTURAL_OPTIONS.INVALID_PATHS });
  }
});

void test("Known Sites scope picker includes only canonical keys and isolates ports/databases", () => {
  const scopes = [
    { origin: "https://options.example:9443", database: "master" },
    { origin: "https://options.example:9443", database: "web" },
    { origin: "https://options.example", database: "master" },
  ];
  const values = Object.fromEntries(scopes.map((scope) => [knownSitesStorageKey(scope), []]));
  Object.assign(values, {
    foblesKnownSites: [],
    "foblesKnownSites:%broken:master": [],
    "foblesKnownSites:https%3A%2F%2Foptions.example:MASTER": [],
    "foblesKnownSites:https%3A%2F%2Foptions.example:master:en": [],
    unrelated: [],
  });
  const actual = knownSiteScopes(values);
  assert.equal(actual.length, scopes.length);
  assert.deepEqual(new Set(actual.map(knownSitesStorageKey)), new Set(scopes.map(knownSitesStorageKey)));
});