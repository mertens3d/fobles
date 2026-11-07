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

void test("structural Options expose diagnostics only and preserve immutable classification roots", () => {
  const defaults = normalizeStructuralSettings(undefined);
  const draft = structuralSettingsDraft(defaults);
  assert.deepEqual(Object.keys(draft), ["showToolbarDiagnostics"]);
  assert.equal(parseStructuralSettingsDraft({ showToolbarDiagnostics: true }).showToolbarDiagnostics, true);
  assert.deepEqual(parseStructuralSettingsDraft(draft).baseTemplatePaths, defaults.baseTemplatePaths);
  assert.deepEqual(normalizeStructuralSettings({ baseTemplatePaths: { page: [], site: [], tenant: [] } }).baseTemplatePaths, defaults.baseTemplatePaths);
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