import assert from "node:assert/strict";
import { test } from "node:test";
import { KNOWN_SITES } from "../../../src/shared/structural/structural.const.ts";
import { knownSitesStorageKey } from "../../../src/shared/known-sites/known-sites-model.ts";
import { historyStorageKey } from "../../../src/shared/item-history/item-history-model.ts";
import { readKnownSites, subscribeKnownSites, mutateKnownSites } from "../../../src/shared/known-sites/known-sites-repository.ts";
import { getStructuralSettings, saveStructuralSettings, watchStructuralSettings } from "../../../src/shared/structural/structural-settings.ts";
import type { KnownSite, KnownSitesResponse, KnownSitesChange } from "../../../src/shared/structural/structural.types.ts";
import { guid, SCOPE } from "./structural-fixture.ts";

void test("Known Sites serialized background persistence and trusted sender boundaries", async (t) => {
  const extensionId = "fobles-test";
  const sender = { id: extensionId, origin: SCOPE.origin, url: `${SCOPE.origin}/sitecore/shell` };
  const optionsUrl = `chrome-extension://${extensionId}/options.html`;
  const historyKey = historyStorageKey(SCOPE);
  const values: Record<string, unknown> = {
    legacyKnownSites: [{ id: guid(99) }],
    [historyKey]: [{ id: guid(77), name: "Home", path: "/sitecore/content/Home", category: "Content", lastVisitedAt: 123 }],
  };
  const before = structuredClone(values);
  const listeners = new Set<(changes: Record<string, chrome.storage.StorageChange>, area: string) => void>();
  let messageListener: ((request: unknown, sender: chrome.runtime.MessageSender, respond: (response: KnownSitesResponse) => void) => boolean) | undefined;
  let failWrite = false;
  const original = Object.getOwnPropertyDescriptor(globalThis, "chrome");
  const get = (keys: string[]): Promise<Record<string, unknown>> => Promise.resolve(Object.fromEntries(keys.filter((key) => key in values).map((key) => [key, structuredClone(values[key])])));
  const set = (area: string) => (next: Record<string, unknown>): Promise<void> => {
    if (failWrite) {
      failWrite = false;
      return Promise.reject(new Error("storage write failed"));
    }
    const changes: Record<string, chrome.storage.StorageChange> = {};
    for (const [key, value] of Object.entries(next)) {
      changes[key] = { newValue: structuredClone(value) };
      values[key] = structuredClone(value);
    }
    for (const listener of listeners) {
      listener(changes, area);
    }
    return Promise.resolve();
  };
  function send(request: unknown, from = sender): Promise<KnownSitesResponse> {
    return new Promise((resolve) => messageListener!(request, from, resolve));
  }
  function site(index: number): KnownSite {
    return { id: guid(index), name: `Site ${index}`, path: `/sitecore/content/Site ${index}`, templateId: guid(2), validatedAt: 0 };
  }
  function request(change: KnownSitesChange, scope = SCOPE): unknown {
    return { type: KNOWN_SITES.CHANGE_MESSAGE, scope, change };
  }
  Object.defineProperty(globalThis, "chrome", {
    configurable: true,
    value: {
      runtime: {
        id: extensionId, getURL: () => optionsUrl,
        onMessage: { addListener: (listener: typeof messageListener) => {
          messageListener = listener;
        } },
        sendMessage: (request: unknown) => send(request),
      },
      storage: {
        local: { get, set: set("local") }, sync: { get, set: set("sync") },
        onChanged: {
          addListener: (listener: Parameters<typeof listeners.add>[0]) => listeners.add(listener),
          removeListener: (listener: Parameters<typeof listeners.add>[0]) => listeners.delete(listener),
        },
      },
    },
  });
  t.after(() => {
    if (original) {
      Object.defineProperty(globalThis, "chrome", original);
    } else {
      Reflect.deleteProperty(globalThis, "chrome");
    }
  });
  await import("../../../src/background/known-sites-registration.ts");
  assert.deepEqual(await readKnownSites(SCOPE), []);
  const changes: KnownSite[][] = [];
  const unsubscribe = subscribeKnownSites(SCOPE, (sites) => changes.push(sites));
  await Promise.all([mutateKnownSites(SCOPE, { action: "upsert", site: site(20) }), mutateKnownSites(SCOPE, { action: "upsert", site: site(21) })]);
  assert.equal((await readKnownSites(SCOPE)).length, 2);
  assert.equal(changes.length, 2);
  assert.ok((await readKnownSites(SCOPE)).every((entry) => entry.validatedAt > 0));
  const web = { ...SCOPE, database: "web" };
  await send(request({ action: "upsert", site: site(20) }, web));
  const webSnapshot = structuredClone(values[knownSitesStorageKey(web)]);
  const moved = { ...site(20), name: "Moved", path: "/sitecore/content/Moved" };
  await mutateKnownSites(SCOPE, { action: "upsert", site: moved });
  assert.equal((await readKnownSites(SCOPE)).find((entry) => entry.id === moved.id)?.path, moved.path);
  const snapshot = structuredClone(values);
  for (const from of [
    { ...sender, id: "other-extension" }, { ...sender, url: "https://other.example/sitecore" },
    { ...sender, origin: "https://other.example" },
    { ...sender, url: `chrome-extension://${extensionId}/popup.html`, origin: `chrome-extension://${extensionId}` },
  ]) {
    assert.equal((await send(request({ action: "clear" }), from)).ok, false);
  }
  assert.equal((await send({ type: KNOWN_SITES.CHANGE_MESSAGE, scope: SCOPE, change: { action: "upsert", site: {} } })).ok, false);
  assert.deepEqual(values, snapshot);
  failWrite = true;
  const failed = send(request({ action: "remove", id: guid(20) }));
  const recovered = send(request({ action: "remove", id: guid(21) }));
  assert.equal((await failed).ok, false);
  assert.equal((await recovered).ok, true);
  const options = { id: extensionId, url: optionsUrl, origin: `chrome-extension://${extensionId}` };
  assert.equal((await send(request({ action: "clear" }), options)).ok, true);
  assert.deepEqual(await readKnownSites(SCOPE), []);
  assert.deepEqual(values[knownSitesStorageKey(web)], webSnapshot);
  assert.deepEqual(values.legacyKnownSites, before.legacyKnownSites);
  assert.deepEqual(values[historyKey], before[historyKey]);
  unsubscribe();
  const count = changes.length;
  await mutateKnownSites(SCOPE, { action: "upsert", site: site(22) });
  assert.equal(changes.length, count);

  let settingsChanges = 0;
  const unwatch = watchStructuralSettings(() => {
    settingsChanges += 1;
  });
  const defaults = await getStructuralSettings();
  await saveStructuralSettings({ ...defaults, showToolbarDiagnostics: true });
  assert.equal((await getStructuralSettings()).showToolbarDiagnostics, true);
  assert.equal(settingsChanges, 1);
  unwatch();
});