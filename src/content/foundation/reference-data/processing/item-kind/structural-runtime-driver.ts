import { SITECORE } from "../../../../../constants/sitecore.ts";
import { normalizeHistoryId, normalizeHistoryScope, normalizeHistoryVisit } from "../../../../../shared/item-history/item-history-model.ts";
import { getRuntimeSettings, initializeRuntimeSettings } from "../../../../runtime-settings/runtime-settings.ts";
import type { StructuralScope } from "../../../../../shared/structural/structural.types.ts";
import { extensionLog } from "../../../../logger.ts";
import * as cache from "../../../cache/sitecore-data/sitecore-data-cache.ts";
import { structuralTemplateCacheKey } from "../../../cache/sitecore-data/structural-cache-key.ts";
import type { SitecoreDataCacheKey, SitecoreDataFactMap, SitecoreDataFactName } from "../../../cache/sitecore-data/sitecore-data-cache.types.ts";
import type { TemplateDerivedRecord } from "../../../cache/sitecore-data/template-derived.types.ts";
import { resolveSitecoreDataIdentity } from "../../../sitecore/data/sitecore-data-identity.ts";
import { WORK_SCHEDULING } from "../../../workers/work-scheduling.const.ts";
import type { SitecoreItemLocator } from "../../../workers/tasks/worker-task.types.ts";
import type { ItemGraphNodeData } from "../../model/sitecore-item.types.ts";
import type { StructuralDriver, StructuralItem, StructuralRead, StructuralRuntimeOptions } from "./structural-service.types.ts";

export async function createStructuralRuntimeDriver(scope: StructuralScope, options: StructuralRuntimeOptions): Promise<StructuralDriver> {
  const normalized = normalizeHistoryScope(scope);
  const identity = options?.identity ?? resolveSitecoreDataIdentity();
  if (normalized.origin !== (options?.origin ?? location.origin) || normalized.database !== identity.database.trim().toLowerCase()) {
    throw new TypeError("Structural discovery requires the current Sitecore origin/database");
  }
  await initializeRuntimeSettings();
  const session = options.createSession(WORK_SCHEDULING.BACKGROUND);
  const now = options?.now ?? Date.now;
  const inflight = new Map<string, Promise<StructuralRead<unknown> | undefined>>();
  const failures: unknown[] = [];
  let finishPromise: Promise<void> | undefined;

  function urlFor(item: SitecoreItemLocator): string {
    const url = new URL(SITECORE.RELATIVE_PATHS_ENCODED.CONTENT_EDITOR_MODERN, normalized.origin);
    url.searchParams.set(SITECORE.SEARCH_PARAMS.FOCUSED_ITEM, item.value);
    url.searchParams.set(SITECORE.SEARCH_PARAMS.CONTENT_DATABASE, normalized.database);
    url.searchParams.set("sc_lang", identity.language);
    return url.href;
  }

  function keyFor(item: SitecoreItemLocator): SitecoreDataCacheKey {
    return { ...identity, environment: normalized.origin, database: normalized.database, item };
  }

  function verifiedItem(scItem: ItemGraphNodeData | undefined, requested: SitecoreItemLocator): StructuralItem | undefined {
    let result: StructuralItem | undefined;
    try {
      const visit = normalizeHistoryVisit({ id: scItem?.scItemId, name: scItem?.scItemName, path: scItem?.scItemPath });
      const matches = requested.kind === "id" ? normalizeHistoryId(requested.value) === visit.id
        : requested.value.trim().replace(/\/+$/, "").toLowerCase() === visit.path.toLowerCase();
      if (matches) {
        result = { ...visit, templateId: normalizeHistoryId(scItem?.scTemplate?.scItemId) };
      }
    } catch {
      result = undefined;
    }
    return result;
  }

  async function live<K extends SitecoreDataFactName>(key: SitecoreDataCacheKey, name: K): Promise<StructuralRead<SitecoreDataFactMap[K]> | undefined> {
    const item = key.item;
    const base = { taskId: crypto.randomUUID(), url: urlFor(item) };
    if (name === "parent") {
      const identityFact = await quickInfo(item, true);
      if (!identityFact?.value) {
        return undefined;
      }
    }
    const result = name === "quickInfo"
      ? await session.runTask({ ...base, type: "get-quick-info", requested: item })
      : name === "templateBases"
        ? await session.runTask({ ...base, type: "get-template-bases", requested: item })
        : await session.runTask({ ...base, type: "get-parent" });
    if (name === "templateBases" && result?.status === "success" && result.type === "get-template-bases" &&
      result.payload.inheritedTemplateIds === undefined) {
      extensionLog.warn("Structural discovery: template inheritance unavailable", {
        scope: normalized, target: item, reason: "missing-inheritance-tab-data",
      });
    }
    let value: SitecoreDataFactMap[K] | undefined;
    if (result?.status === "success") {
      if (name === "quickInfo" && result.type === "get-quick-info" && result.payload.result.status !== "error") {
        if (result.payload.result.status === "not-found" || verifiedItem(result.payload.result.value, item)) {
          value = { result: result.payload.result } as SitecoreDataFactMap[K];
        }
      } else if (name === "templateBases" && result.type === "get-template-bases" && result.payload.inheritedTemplateIds !== undefined) {
        value = result.payload as SitecoreDataFactMap[K];
      } else if (name === "parent" && result.type === "get-parent") {
        value = result.payload as SitecoreDataFactMap[K];
      }
    }
    let resultFact: StructuralRead<SitecoreDataFactMap[K]> | undefined;
    extensionLog.debug("Structural discovery: read result", {
      scope: normalized, target: item, fact: name, status: result?.status ?? "unavailable", available: value !== undefined,
      reason: name === "quickInfo" && result?.status === "success" && result.type === "get-quick-info"
        ? result.payload.result.status : undefined,
    });
    if (name === "quickInfo" && (value === undefined ||
      (value as SitecoreDataFactMap["quickInfo"]).result.status === "not-found")) {
      extensionLog.warn("Structural discovery: Quick Info did not resolve target", {
        scope: normalized, target: item, reason: item.kind === "path" ? "unmatched-root-or-parent-path" : "missing-item",
      });
    }
    if (value !== undefined) {
      const verifiedAt = now();
      await cache.putFact(key, name, value, { lastVerifiedAt: verifiedAt });
      resultFact = { value, cachedAt: verifiedAt };
      if (name === "quickInfo") {
        const quick = value as SitecoreDataFactMap["quickInfo"];
        const id = normalizeHistoryId(quick.result.value?.scItemId);
        if (id && item.kind === "path") {
          await cache.putFact(keyFor({ kind: "id", value: id }), "quickInfo", quick, { lastVerifiedAt: verifiedAt });
        }
      }
    }
    return resultFact;
  }

  async function read<K extends SitecoreDataFactName>(key: SitecoreDataCacheKey, name: K, fresh: boolean): Promise<StructuralRead<SitecoreDataFactMap[K]> | undefined> {
    const stored = await cache.getFact(key, name);
    const cached = stored && { ...stored, cachedAt: stored.lastVerifiedAt ?? stored.cachedAt };
    const token = JSON.stringify([key.database, key.language, key.item, name]);
    let result: StructuralRead<SitecoreDataFactMap[K]> | undefined;
    if (!cached || fresh || now() - cached.cachedAt >= getRuntimeSettings().structuralCache.maxUnvalidatedAgeMs) {
      let refresh = inflight.get(token);
      if (!refresh) {
        extensionLog.debug("Structural discovery: read start", { scope: normalized, target: key.item, fact: name, fresh });
        refresh = live(key, name).catch((error: unknown) => {
          extensionLog.warn("Structural discovery: read failed", { scope: normalized, target: key.item, fact: name, error });
          failures.push(error);
          return undefined;
        });
        inflight.set(token, refresh);
      }
      if (!cached || fresh) {
        result = await refresh as StructuralRead<SitecoreDataFactMap[K]> | undefined;
      } else {
        result = cached;
      }
    } else {
      result = cached;
    }
    return result;
  }

  async function quickInfo(item: SitecoreItemLocator, fresh: boolean): Promise<StructuralRead<StructuralItem | null> | undefined> {
    const fact = await read(keyFor(item), "quickInfo", fresh);
    let result: StructuralRead<StructuralItem | null> | undefined;
    if (fact?.value.result.status === "not-found") {
      result = { value: null, cachedAt: fact.cachedAt };
    } else if (fact?.value.result.status === "found" && fact.value.result.value) {
      const value = verifiedItem(fact.value.result.value, item);
      if (value) {
        result = { value, cachedAt: fact.cachedAt };
      } else if (!fresh) {
        result = await quickInfo(item, true);
      }
    }
    if (item.kind === "path") {
      extensionLog.debug(result?.value ? "Structural discovery: path verified" : "Structural discovery: unmatched path", {
        scope: normalized, target: item, resolvedId: result?.value?.id, fresh,
        reason: result?.value ? "exact-path-match" : result?.value === null ? "item-not-found" : "quick-info-unavailable-or-mismatched",
      });
    }
    return result;
  }

  async function parent(id: string, fresh = false): Promise<StructuralRead<string | undefined> | undefined> {
    const item: SitecoreItemLocator = { kind: "id", value: id };
    const resolved = await quickInfo(item, fresh);
    const fact = resolved?.value ? await read(keyFor(item), "parent", fresh) : undefined;
    let result: StructuralRead<string | undefined> | undefined;
    if (fact) {
      const parentItem = fact.value.parent;
      const parentId = normalizeHistoryId(parentItem?.scItemId);
      if (parentId || !parentItem?.scItemPath) {
        result = { value: parentId, cachedAt: fact.cachedAt };
      } else {
        const verified = await quickInfo({ kind: "path", value: parentItem.scItemPath }, fresh);
        result = { value: verified?.value?.id, cachedAt: Math.min(fact.cachedAt, verified?.cachedAt ?? fact.cachedAt) };
      }
    }
    return result;
  }

  async function bases(id: string, fresh: boolean): Promise<StructuralRead<readonly string[]> | undefined> {
    const key = structuralTemplateCacheKey(normalized, id);
    const fact = await read(key, "templateBases", fresh);
    return fact?.value.inheritedTemplateIds === undefined
      ? undefined
      : { value: fact.value.inheritedTemplateIds, cachedAt: fact.cachedAt };
  }

  async function readDerived(id: string): Promise<StructuralRead<TemplateDerivedRecord> | undefined> {
    return cache.getFact(structuralTemplateCacheKey(normalized, id), "templateDerived");
  }

  async function writeDerived(id: string, value: TemplateDerivedRecord): Promise<void> {
    await cache.putFact(structuralTemplateCacheKey(normalized, id), "templateDerived", value);
  }

  async function drain(): Promise<void> {
    try {
      let size: number;
      do {
        size = inflight.size;
        await Promise.allSettled(Array.from(inflight.values()));
      } while (size !== inflight.size);
    } finally {
      try {
        await session.complete();
      } finally {
        inflight.clear();
        await session.cancel();
      }
    }
    if (failures.length > 0) {
      throw Object.assign(new Error("Structural background reads failed"), { cause: failures });
    }
  }

  function finish(): Promise<void> {
    finishPromise ??= drain();
    return finishPromise;
  }

  return { quickInfo, parent, bases, readDerived, writeDerived, finish };
}