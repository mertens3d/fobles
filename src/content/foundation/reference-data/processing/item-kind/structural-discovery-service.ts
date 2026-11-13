import { SITECORE } from "../../../../../constants/sitecore.const.ts";
import { getStructuralCacheMaxUnvalidatedAgeMs, initializeRuntimeSettings } from "../../../../runtime-settings/runtime-settings.ts";
import { normalizeHistoryScope, normalizeHistoryVisit } from "../../../../../shared/item-history/item-history-model.ts";
import { isWithinSitePath, knownSitesStorageKey, matchKnownSite } from "../../../../../shared/known-sites/known-sites-model.ts";
import { ITEM_KIND, STRUCTURAL } from "../../../../../shared/structural/structural.const.ts";
import type { KnownSite, StructuralScope, StructuralSettings, StructuralVisit } from "../../../../../shared/structural/structural.types.ts";
import { extensionLog } from "../../../../logger.ts";
import { createTemplateStructuralService } from "./template-structural-service.ts";
import type { StructuralDiscoveryService, StructuralDriver, StructuralServiceDependencies } from "./structural-service.types.ts";

export function createStructuralDiscoveryService(deps: StructuralServiceDependencies): StructuralDiscoveryService {
  const templates = new Map<string, ReturnType<typeof createTemplateStructuralService>>();
  const pending = new Set<string>();
  const validatedSettings = new Map<string, string>();
  let queue: Promise<void> = Promise.resolve();

  function fingerprint(_settings: StructuralSettings): string {
    return "immutable-classification-roots-v1";
  }

  function needsValidation(scope: StructuralScope, site: KnownSite, settings: StructuralSettings): boolean {
    const scopeKey = knownSitesStorageKey(scope);
    const stamp = validatedSettings.get(`${scopeKey}:${site.id}`);
    const expired = site.validatedAt === 0 || deps.now() - site.validatedAt >= getStructuralCacheMaxUnvalidatedAgeMs();
    const settingsChanged = stamp !== undefined && stamp !== fingerprint(settings);
    return expired || settingsChanged;
  }

  async function saveSite(scope: StructuralScope, site: KnownSite, settings: StructuralSettings): Promise<void> {
    await deps.upsertSite(scope, site);
    validatedSettings.set(`${knownSitesStorageKey(scope)}:${site.id}`, fingerprint(settings));
    extensionLog.debug("Structural discovery: Site found", { scope, target: site });
  }

  async function validateSite(scope: StructuralScope, site: KnownSite, driver: StructuralDriver, settings: StructuralSettings): Promise<void> {
    extensionLog.debug("Structural discovery: validation start", { scope, target: site });
    const resolved = await driver.quickInfo({ kind: "id", value: site.id }, false);
    if (resolved?.value === null) {
      await deps.removeSite(scope, site.id);
      extensionLog.debug("Structural discovery: validation result", { scope, target: site, reason: "site-not-found" });
    } else if (resolved?.value) {
      const model = templates.get(knownSitesStorageKey(scope))!;
      const classification = await model.classify(resolved.value, driver, settings, deps.now(), false, scope);
      if (classification.complete && !classification.stale) {
        if (classification.kind === ITEM_KIND.SITE && resolved.value.templateId) {
          await saveSite(scope, { ...resolved.value, templateId: resolved.value.templateId, validatedAt: deps.now() }, settings);
        } else {
          await deps.removeSite(scope, site.id);
        }
      }
      extensionLog.debug("Structural discovery: validation result", { scope, target: resolved.value, classification });
    } else {
      extensionLog.warn("Structural discovery: validation unavailable", { scope, target: site, reason: "missing-item" });
      extensionLog.debug("Structural discovery: validation result", { scope, target: site, reason: "quick-info-unavailable" });
    }
  }

  async function discover(scope: StructuralScope, visit: StructuralVisit, fresh: boolean): Promise<void> {
    await initializeRuntimeSettings();
    const scopeKey = knownSitesStorageKey(scope);
    if (!templates.has(scopeKey)) {
      templates.set(scopeKey, createTemplateStructuralService());
    }
    const settings = await deps.settings();
    const sites = await deps.readSites(scope);
    const known = fresh ? undefined : matchKnownSite(sites, visit.path);
    const validate = known !== undefined && needsValidation(scope, known, settings);
    extensionLog.debug("Structural discovery: start", {
      scope, target: visit, fresh, knownSite: known?.id, validate,
    });
    extensionLog.debug(known ? "Structural discovery: cache path match" : "Structural discovery: unmatched path", {
      scope, target: visit, siteId: known?.id, reason: fresh ? "forced-rediscovery" : known ? "known-site-match" : "no-known-site-match",
    });
    const driver = !known || validate ? await deps.createDriver(scope) : undefined;
    try {
      if (driver) {
        if (known && validate) {
          await validateSite(scope, known, driver, settings);
        }
        const matched = known && matchKnownSite(await deps.readSites(scope), visit.path);
        if (!matched) {
          await walkAncestors(scope, visit, driver, settings, fresh);
        }
      }
    } finally {
      await driver?.finish();
      const site = matchKnownSite(await deps.readSites(scope), visit.path);
      extensionLog.debug("Structural discovery: result", {
        scope, target: visit, fresh, site, reason: site ? "site-matched" : "no-site-resolved",
      });
    }
  }

  async function walkAncestors(
    scope: StructuralScope, visit: StructuralVisit, driver: StructuralDriver, settings: StructuralSettings, fresh: boolean,
  ): Promise<void> {
    const seen = new Set<string>();
    let id: string | undefined = visit.id;
    let reason = "missing-parent";
    while (id && seen.size < STRUCTURAL.MAX_ANCESTORS && !seen.has(id)) {
      seen.add(id);
      const resolved = await driver.quickInfo({ kind: "id", value: id }, fresh);
      if (!fresh && resolved && deps.now() - resolved.cachedAt >= getStructuralCacheMaxUnvalidatedAgeMs()) {
        enqueue(scope, visit, true);
      }
      const item = resolved?.value;
      const root = SITECORE.ITEM_KIND.PATH_ROOTS.CONTENT;
      if (!item || !isWithinSitePath(item.path, root) || item.path.toLowerCase() === root.toLowerCase()) {
        reason = !item ? "missing-item" : item.path.toLowerCase() === root.toLowerCase() ? "content-root" : "outside-content-root";
        if (!item) {
          extensionLog.warn("Structural discovery: Quick Info unavailable", {
            scope, target: { id }, reason: resolved ? "item-not-found" : "quick-info-unavailable", fresh,
          });
        }
        break;
      }
      const model = templates.get(knownSitesStorageKey(scope))!;
      let classification = await model.classify(item, driver, settings, deps.now(), fresh, scope);
      extensionLog.debug("Structural discovery: ancestor classified", { scope, target: item, classification, fresh });
      if (!item.templateId || !classification.complete) {
        extensionLog.warn("Structural discovery: ancestor classification incomplete", {
          scope, target: item, reason: !item.templateId ? "missing-template" : "missing-root-or-template-inheritance", classification,
        });
      }
      if (!fresh && classification.stale) {
        enqueue(scope, visit, true);
      }
      if (classification.kind === ITEM_KIND.SITE) {
        let confirmedSite = false;
        if (classification.stale || deps.now() - resolved.cachedAt >= getStructuralCacheMaxUnvalidatedAgeMs()) {
          const live = await driver.quickInfo({ kind: "id", value: item.id }, true);
          if (live?.value) {
            classification = await model.classify(live.value, driver, settings, deps.now(), true, scope);
            if (classification.complete && !classification.stale && classification.kind === ITEM_KIND.SITE && live.value.templateId) {
              await saveSite(scope, { ...live.value, templateId: live.value.templateId, validatedAt: deps.now() }, settings);
              confirmedSite = true;
            }
          }
        } else if (classification.complete && item.templateId) {
          await saveSite(scope, { ...item, templateId: item.templateId, validatedAt: deps.now() }, settings);
          confirmedSite = true;
        }
        if (confirmedSite || !classification.complete) {
          reason = confirmedSite ? "site-confirmed" : "site-unconfirmed";
          break;
        }
      }
      const parent = await driver.parent(item.id, fresh);
      if (!parent?.value) {
        extensionLog.warn("Structural discovery: parent unavailable", {
          scope, target: item, reason: parent ? "missing-parent-id" : "missing-parent-fact", fresh,
        });
      }
      if (!fresh && parent && deps.now() - parent.cachedAt >= getStructuralCacheMaxUnvalidatedAgeMs()) {
        enqueue(scope, visit, true);
      }
      id = parent?.value;
    }
    extensionLog.debug("Structural discovery: ancestor walk stopped", {
      scope, target: visit, lastAncestorId: id, ancestorsVisited: seen.size, fresh,
      reason: reason === "missing-parent" && id
        ? seen.has(id) ? "parent-cycle" : "ancestor-limit" : reason,
    });
  }

  function enqueue(scope: StructuralScope, visit: StructuralVisit, revalidate = false): void {
    const key = `${knownSitesStorageKey(scope)}:${visit.id}:structural`;
    if (!pending.has(key)) {
      pending.add(key);
      extensionLog.debug("Structural discovery: enqueue", { scope, target: visit, revalidate });
      queue = queue.then(() => discover(scope, visit, revalidate)).catch((error: unknown) => {
        extensionLog.warn("Structural discovery: failed", { scope, target: visit, revalidate, error });
        deps.onError(error);
      }).finally(() => pending.delete(key));
    }
  }

  function scheduleStructuralDiscovery(scope: StructuralScope, visits: readonly StructuralVisit[]): void {
    try {
      const normalizedScope = normalizeHistoryScope(scope);
      for (const visit of visits) {
        enqueue(normalizedScope, normalizeHistoryVisit(visit));
      }
    } catch (error) {
      deps.onError(error);
    }
  }

  async function lookupKnownSite(scope: StructuralScope, path: string): Promise<KnownSite | undefined> {
    await initializeRuntimeSettings();
    const normalizedScope = normalizeHistoryScope(scope);
    const settings = await deps.settings();
    const site = matchKnownSite(await deps.readSites(normalizedScope), path);
    if (site && needsValidation(normalizedScope, site, settings)) {
      enqueueValidation(normalizedScope, site);
    }
    return site;
  }

  function enqueueValidation(scope: StructuralScope, site: KnownSite): void {
    const scopeKey = knownSitesStorageKey(scope);
    const key = `${scopeKey}:${site.id}:structural`;
    if (!pending.has(key)) {
      pending.add(key);
      extensionLog.debug("Structural discovery: validation enqueue", { scope, target: site });
      queue = queue.then(async () => {
        const settings = await deps.settings();
        const current = (await deps.readSites(scope)).find((entry) => entry.id === site.id);
        if (current && needsValidation(scope, current, settings)) {
          if (!templates.has(scopeKey)) {
            templates.set(scopeKey, createTemplateStructuralService());
          }
          const driver = await deps.createDriver(scope);
          try {
            await validateSite(scope, current, driver, settings);
          } finally {
            await driver.finish();
          }
        }
      }).catch((error: unknown) => {
        extensionLog.warn("Structural discovery: validation failed", { scope, target: site, error });
        deps.onError(error);
      }).finally(() => pending.delete(key));
    }
  }

  async function whenIdle(): Promise<void> {
    let observed: Promise<void>;
    do {
      observed = queue;
      await observed;
    } while (observed !== queue);
  }

  function invalidateSettings(): void {
    validatedSettings.clear();
  }

  function invalidateScope(scope: StructuralScope, invalidate: () => Promise<void>): Promise<void> {
    const key = knownSitesStorageKey(scope);
    const result = queue.then(async () => {
      templates.delete(key);
      for (const token of validatedSettings.keys()) {
        if (token.startsWith(`${key}:`)) {
          validatedSettings.delete(token);
        }
      }
      await invalidate();
    });
    queue = result.catch(deps.onError);
    return result;
  }

  function rediscoverScope(scope: StructuralScope, sites: readonly KnownSite[], visits: readonly StructuralVisit[]): number {
    const normalized = normalizeHistoryScope(scope);
    const unique = new Map<string, StructuralVisit>();
    // Stored sites are lookup results, not implicit rediscovery work.
    void sites;
    for (const visit of visits) {
      const row = normalizeHistoryVisit(visit);
      unique.set(row.id, row);
    }
    for (const visit of unique.values()) {
      enqueue(normalized, visit, true);
    }
    return unique.size;
  }

  return { invalidateScope, invalidateSettings, rediscoverScope, scheduleStructuralDiscovery, lookupKnownSite, whenIdle };
}