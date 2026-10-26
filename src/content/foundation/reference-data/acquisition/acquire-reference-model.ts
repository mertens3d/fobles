// @source-path [fobles] src/content/foundation/reference-data/acquisition/acquire-reference-model.ts

import { buildFoblesUrl } from "../../sitecore/fobles-url";
import { getItem, putFact } from "../../cache/sitecore-data/sitecore-data-cache";
import type { SitecoreDataCacheKey } from "../../cache/sitecore-data/sitecore-data-cache.types";
import { resolveSitecoreDataIdentity } from "../../sitecore/data/sitecore-data-identity";
import { extensionLog } from "../../../logger";
import { harvestSitecoreWithWorkers } from "../../harvesting/coordinator/foreground-harvest-coordinator";
import type { HarvestSession } from "../../harvesting/harvest-session.types";
import type {
  HarvestProgressCallback,
  SitecoreHarvestFiltersState,
} from "../../harvesting/sitecore-harvester.types";
import { createSitecoreItemLocator } from "../../harvesting/worker-task-executor";
import { getCurrentItemId } from "../../sitecore/current-item";
import { getScRawValuesState, getScStandardFieldsState } from "../../sitecore/macros/ribbon-toggle-macro";
import { prepareReferenceModel, type PreparedReferenceModel } from "./prepare-reference-model";
import { decideRootCacheUsage, rootProcessingStateForDecision, type RootCacheDecision } from "./root-cache-flow";
import { readLiveRootRevision } from "./root-revision";

export type AcquireReferenceModelOptions = {
  signal: AbortSignal;
  onProgress?: HarvestProgressCallback;
  // Fires exactly once, right before a real harvest is about to run - lets a caller open its own
  // progress UI only when a harvest is actually happening (never for a cache-served decision).
  onHarvestRequired?: () => void;
};

export type AcquiredReferenceModel = {
  itemId: string;
  prepared: PreparedReferenceModel;
  decision: RootCacheDecision;
};

// Captures the caller's Raw Values/Standard Fields state once per acquisition, so a harvest that
// needs to toggle either one restores the editor to exactly how this session found it - shared by
// every feature that may harvest (not just Reference Graph).
export async function captureHarvestSession(doc: Document): Promise<HarvestSession> {
  const rawValues = await getScRawValuesState(doc);
  const standardFields = await getScStandardFieldsState(doc);

  return { requestId: crypto.randomUUID(), originalEditorState: { rawValues, standardFields } };
}

// THE highest-level production entry point for "give me the current item's Reference Model,
// cache/revision-aware" - every consumer (Reference Graph, Auditor) calls this instead of
// independently invoking collectors, createReferenceModel, or harvestSitecoreWithWorkers itself.
export async function acquireReferenceModelForCurrentItem(
  doc: Document,
  filters: SitecoreHarvestFiltersState,
  { signal, onProgress, onHarvestRequired }: AcquireReferenceModelOptions,
): Promise<AcquiredReferenceModel | undefined> {
  const itemId = getCurrentItemId(doc);
  if (!itemId) throw new Error("Something has gone wrong. The current Sitecore item could not be resolved.");

  const cacheKey: SitecoreDataCacheKey = { ...resolveSitecoreDataIdentity(doc), item: createSitecoreItemLocator(itemId) };
  const cachedRecord = await getItem(cacheKey);
  const liveRevision = readLiveRootRevision(doc);
  const decision = decideRootCacheUsage(cachedRecord, filters, liveRevision);

  extensionLog.debug("Reference model: root cache decision", {
    decision: decision.kind,
    cachedRevision: cachedRecord?.quickInfo?.value.revision,
    liveRevision,
  });

  let harvestResult = decision.kind === "harvest-required" ? undefined : decision.result;

  if (decision.kind === "harvest-required") {
    onHarvestRequired?.();

    const harvestSession = await captureHarvestSession(doc);

    harvestResult = await harvestSitecoreWithWorkers(
      { requestId: harvestSession.requestId, url: buildFoblesUrl(itemId), filters, session: harvestSession },
      { signal, onProgress },
    );
  } else if (decision.kind === "cache-only" && cachedRecord?.quickInfo) {
    await putFact(cacheKey, "quickInfo", cachedRecord.quickInfo.value, { verifiedAt: Date.now() });
  }

  if (signal.aborted || !harvestResult) return undefined;

  const prepared = prepareReferenceModel(harvestResult, filters, {
    signal,
    rootProcessingState: rootProcessingStateForDecision(decision.kind),
  });

  return prepared && !signal.aborted ? { itemId, prepared, decision } : undefined;
}
