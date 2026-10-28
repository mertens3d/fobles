// @source-path [fobles] src/content/foundation/reference-data/acquisition/acquire-reference-model.ts

import { getItem, putFact } from "../../cache/sitecore-data/sitecore-data-cache";
import type { SitecoreDataCacheKey, QuickInfoPayload } from "../../cache/sitecore-data/sitecore-data-cache.types";
import { createSitecoreItemLocator } from "../../harvesting/worker-task-executor";
import type { HarvestProgressCallback, SitecoreHarvestFiltersState, SitecoreHarvestResult } from "../../harvesting/sitecore-harvester.types";
import { getCurrentItemId } from "../../sitecore/current-item";
import { resolveSitecoreDataIdentity } from "../../sitecore/data/sitecore-data-identity";
import { buildFoblesUrl } from "../../sitecore/fobles-url";
import type { WorkSession } from "../../workers/session/work-session.types";
import type { WorkerTask, WorkerTaskExecutionResult } from "../../workers/tasks/worker-task.types";
import { extensionLog } from "../../../logger";
import { prepareReferenceModel, type PreparedReferenceModel } from "./prepare-reference-model";
import { decideRootCacheUsage, rootProcessingStateForDecision, type RootCacheDecision } from "./root-cache-flow";
import { readLiveRootRevision } from "./root-revision";

export type AcquireReferenceModelOptions = { signal: AbortSignal; onProgress?: HarvestProgressCallback; onHarvestRequired?: () => void };
export type AcquiredReferenceModel = { itemId: string; prepared: PreparedReferenceModel; decision: RootCacheDecision };

function quickInfoPayload(result: WorkerTaskExecutionResult): QuickInfoPayload | undefined {
  return result.status === "success" && result.type === "get-quick-info" ? result.payload : undefined;
}

function harvestResultFromQuickInfo(payload: QuickInfoPayload): SitecoreHarvestResult | undefined {
  const rootItem = payload.result.status === "found" ? payload.result.value : undefined;
  if (!rootItem?.scItemId) 
return undefined;
  return {
    rootItem: { ...rootItem, scItemId: rootItem.scItemId },
    parent: undefined,
    layoutSectionFields: undefined,
    customFieldSections: undefined,
    standardFieldSections: undefined,
    childItems: undefined,
    referrers: undefined,
  };
}

async function readRootQuickInfo(workSession: WorkSession, itemId: string): Promise<QuickInfoPayload | undefined> {
  const task: Omit<Extract<WorkerTask, { type: "get-quick-info" }>, "requestId"> = {
    taskId: crypto.randomUUID(),
    type: "get-quick-info",
    url: buildFoblesUrl(itemId),
    requested: createSitecoreItemLocator(itemId),
  };
  const result = await workSession.runTask(task);
  return result ? quickInfoPayload(result) : undefined;
}

export async function acquireReferenceModelForCurrentItem(
  doc: Document,
  workSession: WorkSession,
  filters: SitecoreHarvestFiltersState,
  { signal }: AcquireReferenceModelOptions,
): Promise<AcquiredReferenceModel | undefined> {
  const itemId = getCurrentItemId(doc);
  if (!itemId) 
throw new Error("Something has gone wrong. The current Sitecore item could not be resolved.");

  const cacheKey: SitecoreDataCacheKey = { ...resolveSitecoreDataIdentity(doc), item: createSitecoreItemLocator(itemId) };
  const cachedRecord = await getItem(cacheKey);
  const liveRevision = readLiveRootRevision(doc);
  const decision = decideRootCacheUsage(cachedRecord, filters, liveRevision);

  extensionLog.debug("Reference model: root cache decision", {
    decision: decision.kind,
    cachedRevision: cachedRecord?.revision,
    liveRevision,
  });

  let harvestResult = decision.kind === "harvest-required" ? undefined : decision.result;
  let preparedFilters = filters;

  if (decision.kind === "harvest-required") {
    const payload = await readRootQuickInfo(workSession, itemId);
    if (signal.aborted || !payload) 
return undefined;

    harvestResult = harvestResultFromQuickInfo(payload);
    if (!harvestResult) 
return undefined;

    await putFact(cacheKey, "quickInfo", { result: payload.result }, { revision: payload.revision });
    preparedFilters = { parent: false, children: false, referrers: false, customFields: false, standardFields: false, layouts: false, template: true };
  }

  if (signal.aborted || !harvestResult) 
return undefined;

  const prepared = prepareReferenceModel(harvestResult, preparedFilters, {
    signal,
    rootProcessingState: rootProcessingStateForDecision(decision.kind),
  });

  return prepared && !signal.aborted ? { itemId, prepared, decision } : undefined;
}
