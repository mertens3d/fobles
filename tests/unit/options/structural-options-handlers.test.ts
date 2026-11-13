import assert from "node:assert/strict";
import { test } from "node:test";
import { STORAGE } from "../../../src/constants/extension.const.ts";
import { KNOWN_SITES, STRUCTURAL } from "../../../src/shared/structural/structural.const.ts";
import { normalizeStructuralSettings } from "../../../src/shared/structural/structural-settings.ts";
import { structuralSettingsDraft } from "../../../src/options/structural/structural-options-model.ts";
import { changeScopedKnownSites, readKnownSiteScopes, saveStructuralOptions } from "../../../src/options/structural/structural-options-handlers.ts";
import { knownSitesStorageKey } from "../../../src/shared/known-sites/known-sites-model.ts";

void test("Options structural handlers use scoped writer and storage facade without collateral writes", async (t) => {
  const scope = { origin: "https://options.example:9443", database: "master" };
  const otherScope = { ...scope, database: "web" };
  const local: Record<string, unknown> = { [knownSitesStorageKey(scope)]: [], [knownSitesStorageKey(otherScope)]: [] };
  const sync: Record<string, unknown> = { [STORAGE.KEY.DEBUG_LOGGING]: true, unrelated: "preserved" };
  const messages: unknown[] = [];
  let failStorage = false;
  let failWriter = false;
  const original = Object.getOwnPropertyDescriptor(globalThis, "chrome");
  Object.defineProperty(globalThis, "chrome", {
    configurable: true,
    value: {
      storage: {
        local: { get: () => Promise.resolve(structuredClone(local)) },
        sync: {
          get: () => failStorage ? Promise.reject(new Error("read failed")) : Promise.resolve(structuredClone(sync)),
          set: (values: Record<string, unknown>) => {
            if (failStorage) {
              return Promise.reject(new Error("write failed"));
            }
            Object.assign(sync, structuredClone(values));
            return Promise.resolve();
          },
        },
      },
      runtime: { sendMessage: (request: unknown) => {
        messages.push(request);
        return Promise.resolve(failWriter ? { ok: false, error: "writer failed" } : { ok: true, sites: [] });
      } },
    },
  });
  t.after(() => {
    if (original) {
      Object.defineProperty(globalThis, "chrome", original);
    } else {
      Reflect.deleteProperty(globalThis, "chrome");
    }
  });

  assert.equal((await readKnownSiteScopes()).length, 2);
  const draft = structuralSettingsDraft(normalizeStructuralSettings(undefined));
  await saveStructuralOptions({ ...draft, showToolbarDiagnostics: true });
  assert.equal(sync[STORAGE.KEY.SHOW_DEVELOPER_BUTTON], undefined);
  assert.equal(sync[STORAGE.KEY.DEBUG_LOGGING], true);
  assert.equal(sync.unrelated, "preserved");
  assert.deepEqual(sync[STRUCTURAL.SETTINGS_KEY], normalizeStructuralSettings({ ...normalizeStructuralSettings(undefined), showToolbarDiagnostics: true }));
  const site = { id: "00000000-0000-0000-0000-000000000001", name: "Edited", path: "/sitecore/content/Edited", templateId: "00000000-0000-0000-0000-000000000002", validatedAt: 0 };
  await changeScopedKnownSites(scope, { action: "upsert", site });
  await changeScopedKnownSites(scope, { action: "remove", id: site.id });
  await changeScopedKnownSites(otherScope, { action: "clear" });
  assert.deepEqual(messages, [
    { type: KNOWN_SITES.CHANGE_MESSAGE, scope, change: { action: "upsert", site } },
    { type: KNOWN_SITES.CHANGE_MESSAGE, scope, change: { action: "remove", id: site.id } },
    { type: KNOWN_SITES.CHANGE_MESSAGE, scope: otherScope, change: { action: "clear" } },
  ]);
  await assert.rejects(changeScopedKnownSites(scope, { action: "upsert", site: { ...site, path: "/outside" } }));
  assert.equal(messages.length, 3);
  failWriter = true;
  await assert.rejects(changeScopedKnownSites(scope, { action: "clear" }), /writer failed/);
  failStorage = true;
  await assert.rejects(saveStructuralOptions(draft), /write failed/);
  assert.deepEqual(local, { [knownSitesStorageKey(scope)]: [], [knownSitesStorageKey(otherScope)]: [] });
});