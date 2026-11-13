import { getRuntimeSettings } from "../../../src/content/runtime-settings/runtime-settings.ts";
import { normalizeStructuralSettings } from "../../../src/shared/structural/structural-settings.ts";
import { applyKnownSitesChange, knownSitesStorageKey } from "../../../src/shared/known-sites/known-sites-model.ts";
import type { KnownSite, StructuralScope } from "../../../src/shared/structural/structural.types.ts";
import type { StructuralDriver, StructuralItem, StructuralRead } from "../../../src/content/foundation/reference-data/processing/item-kind/structural-service.types.ts";
import { createStructuralDiscoveryService } from "../../../src/content/foundation/reference-data/processing/item-kind/structural-discovery-service.ts";
import type { TemplateDerivedRecord } from "../../../src/content/foundation/cache/sitecore-data/sitecore-data.types.ts";
import { SITECORE } from "../../../src/constants/sitecore.const.ts";

export const SCOPE: StructuralScope = { origin: "https://sitecore.example:8443", database: "master" };

export function guid(index: number): string {
  return `00000000-0000-0000-0000-${index.toString(16).padStart(12, "0")}`;
}

export function fixture() {
  let now = 1000;
  getRuntimeSettings().structuralCache.maxUnvalidatedAgeHours = 100;
  const settings = normalizeStructuralSettings(undefined);
  const items = new Map<string, StructuralItem | null>();
  const bases = new Map<string, readonly string[] | undefined>();
  const derived = new Map<string, StructuralRead<TemplateDerivedRecord>>();
  const parents = new Map<string, string>();
  const sites = new Map<string, KnownSite[]>();
  const calls: string[] = [];
  const errors: unknown[] = [];
  let cachedAt = now;
  let freshUnavailable = false;
  for (const [kind, id] of [["PAGE", guid(1)], ["SITE", guid(2)], ["TENANT", guid(3)]] as const) {
    const path = SITECORE.ITEM_KIND.BASE_TEMPLATE_PATHS[kind][0];
    const item = { id, name: kind, path };
    items.set(path, item);
    items.set(id, item);
    bases.set(id, []);
  }
  const driver: StructuralDriver = {
    quickInfo: (locator, fresh) => {
      calls.push(`qi:${locator.value}:${fresh}`);
      const value = items.get(locator.value);
      const result = value === undefined || (fresh && freshUnavailable) ? undefined
        : { value, cachedAt: fresh ? now : cachedAt };
      return Promise.resolve(result);
    },
    bases: (id, fresh) => {
      calls.push(`bases:${id}:${fresh}`);
      const value = bases.get(id);
      return Promise.resolve(value === undefined || (fresh && freshUnavailable)
        ? undefined : { value, cachedAt: fresh ? now : cachedAt });
    },
    parent: (id, fresh = false) => {
      calls.push(`parent:${id}${fresh ? ":true" : ""}`);
      return Promise.resolve(fresh && freshUnavailable ? undefined : { value: parents.get(id), cachedAt: fresh ? now : cachedAt });
    },
    readDerived: (id) => Promise.resolve(derived.get(id)),
    writeDerived: (id, value) => {
      derived.set(id, { value, cachedAt: now });
      return Promise.resolve();
    },
    finish: () => {
      calls.push("finish");
      cachedAt = now;
      return Promise.resolve();
    },
  };
  const createService = () => createStructuralDiscoveryService({
    createDriver: (scope) => {
      calls.push(`driver:${knownSitesStorageKey(scope)}`);
      return Promise.resolve(driver);
    },
    settings: () => Promise.resolve(settings),
    readSites: (scope) => Promise.resolve(sites.get(knownSitesStorageKey(scope)) ?? []),
    upsertSite: (scope, site) => {
      const key = knownSitesStorageKey(scope);
      sites.set(key, applyKnownSitesChange(sites.get(key), { action: "upsert", site }, now));
      return Promise.resolve();
    },
    removeSite: (scope, id) => {
      const key = knownSitesStorageKey(scope);
      sites.set(key, applyKnownSitesChange(sites.get(key), { action: "remove", id }, now));
      return Promise.resolve();
    },
    now: () => now,
    onError: (error) => errors.push(error),
  });
  const service = createService();
  function content(index: number, path: string, templateId: string): StructuralItem {
    const item = { id: guid(index), name: path.substring(path.lastIndexOf("/") + 1), path, templateId };
    items.set(item.id, item);
    return item;
  }
  function readSites(scope = SCOPE): KnownSite[] {
    return sites.get(knownSitesStorageKey(scope)) ?? [];
  }
  function seed(site: KnownSite, scope = SCOPE): void {
    sites.set(knownSitesStorageKey(scope), [site]);
  }
  return {
    settings, driver, service, createService, items, bases, derived, parents, calls, errors, content, readSites, seed,
    age: () => {
      now += 101;
    },
    unavailable: () => {
      freshUnavailable = true;
    },
    read: <T>(value: T): StructuralRead<T> => ({ value, cachedAt }),
  };
}