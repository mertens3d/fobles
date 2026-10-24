// @source-path [fobles] src/content/sitecore-data/sitecore-data-service.ts

import * as cache from "../sitecore-data-cache/sitecore-data-cache.ts";
import { emitActivity } from "../shared/activity/activity-events.ts";
import type {
  SitecoreDataCacheKey,
  SitecoreDataFactMap,
  SitecoreDataFactName,
} from "../sitecore-data-cache/sitecore-data-cache.types";
import type {
  WorkerTaskExecutionResult,
  WorkerTaskSuccessResult,
  WorkerTaskType,
} from "../sitecore-worker/tasks/worker-task.types";
import type { FetchLiveFact, GetFactOptions, SitecoreDataFactResult } from "./sitecore-data.types";

// Only these 7 atomic reads have a cacheable fact - set-raw-values/set-standard-fields are
// mutations and are never routed through this service at all.
const FACT_NAME_BY_TASK_TYPE: ReadonlyMap<WorkerTaskType, SitecoreDataFactName> = new Map([
  ["get-quick-info", "quickInfo"],
  ["get-parent", "parent"],
  ["get-children", "children"],
  ["get-referrers", "referrers"],
  ["get-custom-fields", "customSections"],
  ["get-standard-fields", "standardSections"],
  ["get-layout", "layout"],
]);

export function factNameForTaskType(taskType: WorkerTaskType): SitecoreDataFactName | undefined {
  return FACT_NAME_BY_TASK_TYPE.get(taskType);
}

// Cacheable: a genuinely settled read (found or not-found). Not cacheable: document-stale,
// cancelled, and transient worker/navigation/timeout errors - all of those should be retried
// live next time, never frozen into the cache.
function isCacheableResult(result: WorkerTaskExecutionResult): result is WorkerTaskSuccessResult {
  if (result.status !== "success") return false;
  if (result.type === "get-quick-info") return result.payload.result.status !== "error";

  return true;
}

function extractFactValue<TName extends SitecoreDataFactName>(
  factName: TName,
  result: WorkerTaskSuccessResult,
): SitecoreDataFactMap[TName] {
  // The payload shape for `result.type` already *is* SitecoreDataFactMap[factName] by
  // construction (Phase 3A's fact types are direct aliases of these same Phase 2 payloads).
  return result.payload as SitecoreDataFactMap[TName];
}

function emitCacheActivity(
  activityId: string,
  factName: SitecoreDataFactName,
  state: "started" | "completed" | "error" | "cancelled",
  detail: string,
): void {
  emitActivity({ source: "cache", activityId, kind: factName, label: factName, state, detail });
}

// Read-through: a cache hit never executes `fetchLive` at all; a miss executes it, caches a
// cacheable outcome, and returns the live value either way. Background revalidation, priority
// scheduling, and trust heuristics are explicitly out of scope until Phase 3C.
export async function getFact<TName extends SitecoreDataFactName>(
  key: SitecoreDataCacheKey,
  factName: TName,
  fetchLive: FetchLiveFact,
  options?: GetFactOptions,
): Promise<SitecoreDataFactResult<SitecoreDataFactMap[TName]>> {
  const activityId = crypto.randomUUID();
  const cached = await cache.getFact(key, factName);

  if (cached) {
    emitCacheActivity(activityId, factName, "completed", "cache hit");

    return {
      outcome: "resolved",
      fact: {
        value: cached.value,
        source: "cache",
        cachedAt: cached.cachedAt,
        lastVerifiedAt: cached.lastVerifiedAt,
      },
    };
  }

  emitCacheActivity(activityId, factName, "started", "cache miss; fetching live");
  const result = await fetchLive();

  if (!isCacheableResult(result) || FACT_NAME_BY_TASK_TYPE.get(result.type) !== factName) {
    emitCacheActivity(
      activityId,
      factName,
      result.status === "cancelled" ? "cancelled" : "error",
      `live fetch not cacheable (status=${result.status})`,
    );

    return { outcome: "unresolved", result };
  }

  const value = extractFactValue(factName, result);
  await cache.putFact(key, factName, value);
  emitCacheActivity(activityId, factName, "completed", "live; cached");

  return { outcome: "resolved", fact: { value, source: "live" } };
}
