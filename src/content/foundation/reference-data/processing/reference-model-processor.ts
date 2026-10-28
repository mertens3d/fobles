// @source-path [fobles] src/content/foundation/reference-data/processing/reference-model-processor.ts
import { extensionLog } from "../../../logger";
import { initializeRuntimeSettings, isJourneyStepLiveEnabled } from "../../../runtime-settings/runtime-settings";
import type { HealthReport } from "../../diagnostics/health.types";
import { resolveSitecoreDataIdentity } from "../../sitecore/data/sitecore-data-identity";
import { mergeEnrichedItem } from "../../harvesting/planner/enrichment-task-planner";
import { createSitecoreItemLocator } from "../../harvesting/worker-task-executor";
import { createErrorResult, type WorkerTask, type WorkerTaskExecutionResult } from "../../workers/tasks/worker-task.types";
import type { WorkSession } from "../../workers/session/work-session.types";
import { buildFoblesUrl } from "../../sitecore/fobles-url";
import type { SitecoreDataCacheKey } from "../../cache/sitecore-data/sitecore-data-cache.types";
import type { ItemGraphNodeData } from "../model/sitecore-item.types";
import type { ReferenceModelNode } from "../model/reference-model.types";
import { collectEnrichmentGuidLookup, isEligibleForResolve } from "./resolve-candidate-collector";
import { sortGuidsByEnrichmentPriority } from "./reference-model-processing-priority";
import { firstItemNode, itemsFor } from "./reference-model-processing-tree-state";
import type { ReferenceModelProcessingController, ReferenceModelProcessingProgress, ReferenceModelProcessingStateChange } from "./reference-model-processing.types";
import { setProcessingState, type ProcessingStateByTreeNodeId, type ProcessingStatus } from "./processing-state";
import { readCachedItemFact, verifyItemFact, type CachedItemFact, type ResolveOutcome } from "./resolve-fact";
// The harvest queue's aggregate activity. The processor does not exit while a re-harvest is pending, and re-scans the model whenever the queue reports activity because a finished re-harvest can introduce new references.
export type ReferenceModelHarvestActivity = {
    pendingCount: () => number;
    subscribe: (listener: () => void) => () => void;
};
type StartReferenceModelProcessorOptions = {
    doc: Document;
    workSession: WorkSession;
    referenceModel: ReferenceModelNode;
    nodesById: Map<string, ReferenceModelNode>;
    processingStateByTreeNodeId: ProcessingStateByTreeNodeId;
    onStateChange?: ReferenceModelProcessingStateChange;
    onStaleStructural?: (reference: string, treeNodeIds: readonly string[], setTerminalState: (succeeded: boolean) => void) => void;
    onProgress?: (progress: ReferenceModelProcessingProgress) => void;
    harvestActivity?: ReferenceModelHarvestActivity;
    maxLiveInFlight?: number;
};
type ItemSnapshot = Pick<ItemGraphNodeData, "scItemId" | "scItemName" | "scItemPath" | "scTemplate" | "scItemIcon" | "rawMarkup" | "link">;
type GuidWork = {
    reference: string | undefined;
    cached: CachedItemFact | undefined;
    snapshots: Map<ItemGraphNodeData, ItemSnapshot>;
};
type GuidResult = {
    status: ProcessingStatus;
    value: ItemGraphNodeData | undefined;
};
const NON_TERMINAL_STATUSES = new Set<ProcessingStatus | undefined>([undefined, "pending", "cached", "enriching"]);
const DEFAULT_MAX_LIVE_IN_FLIGHT = 4;
function snapshotOf(item: ItemGraphNodeData): ItemSnapshot { return { scItemId: item.scItemId, scItemName: item.scItemName, scItemPath: item.scItemPath, scTemplate: item.scTemplate, scItemIcon: item.scItemIcon, rawMarkup: item.rawMarkup, link: item.link }; }
export function startReferenceModelProcessor({ doc, workSession, referenceModel, nodesById, processingStateByTreeNodeId, onStateChange, onStaleStructural, onProgress, harvestActivity, maxLiveInFlight = DEFAULT_MAX_LIVE_IN_FLIGHT }: StartReferenceModelProcessorOptions): ReferenceModelProcessingController {
    let disposed = false;
    let lastProgressAt = performance.now();
    let completedItemCount = 0;
    let inFlight = 0;
    let wake: (() => void) | undefined;
    const activeGuids = new Set<string>();
    const identity = resolveSitecoreDataIdentity(doc);
    const guidLookup = collectEnrichmentGuidLookup(referenceModel);
    const guids = sortGuidsByEnrichmentPriority(Array.from(guidLookup.keys()), guidLookup, nodesById);
    const candidateTreeNodeIds = guids.flatMap((guid) => guidLookup.get(guid) ?? []);
    const guidByTreeNodeId = new Map<string, string>();
    guidLookup.forEach((treeNodeIds, guid) => treeNodeIds.forEach((treeNodeId) => guidByTreeNodeId.set(treeNodeId, guid)));
    // One entry per GUID, ever: the lookup is already keyed by normalized reference, so every tree node of an item shares a single queue entry and a single live read.
    const cacheQueue: string[] = [...guids];
    const liveQueue: string[] = [];
    const workByGuid = new Map<string, GuidWork>();
    const resultByGuid = new Map<string, GuidResult>();
    let maxItemCount = guids.length;
    extensionLog.debug("Reference model processor diagnostic: candidates discovered", { workSessionId: workSession.id, candidateGuidCount: guids.length, candidateTreeNodeCount: candidateTreeNodeIds.length, candidates: guids.map((guid) => ({ guid, treeNodeIds: guidLookup.get(guid) ?? [] })) });
    function isStopped(): boolean { return disposed || workSession.signal.aborted; }
    function signal(): void { const pending = wake; wake = undefined; pending?.(); }
    function nextEvent(): Promise<void> { return new Promise<void>((resolve) => { wake = resolve; }); }
    function keyFor(reference: string): SitecoreDataCacheKey { return { ...identity, item: createSitecoreItemLocator(reference) }; }
    function getHealth(): HealthReport {
        const checkedAt = performance.now();
        const noProgressMs = Math.round(checkedAt - lastProgressAt);
        const degraded = !disposed && activeGuids.size > 0 && noProgressMs >= 20000;
        return {
            owner: "ReferenceModelProcessor",
            state: degraded ? "degraded" : "healthy",
            checkedAt,
            lastProgressAt,
            noProgressMs,
            reason: degraded ? "Resolve candidates are waiting for worker recovery or terminal job results" : undefined,
            activeCount: activeGuids.size,
            recoveryCount: 0,
        };
    }
    const unregisterHealth = workSession.registerHealthProvider({ getHealth });
    async function publish(treeNodeIds: readonly string[], status: ProcessingStatus): Promise<void> {
        setProcessingState(treeNodeIds, processingStateByTreeNodeId, status);
        lastProgressAt = performance.now();
        workSession.markProgress(`processor-state:${status}`);
        extensionLog.debug("Reference model processor diagnostic: state published", { workSessionId: workSession.id, status, treeNodeIds, storedStates: treeNodeIds.map((treeNodeId) => ({ treeNodeId, guid: guidByTreeNodeId.get(treeNodeId), processingStatus: processingStateByTreeNodeId.get(treeNodeId) })) });
        await onStateChange?.(treeNodeIds, status, processingStateByTreeNodeId);
    }
    void publish(candidateTreeNodeIds, "pending");
    onProgress?.({ completedItemCount: 0, maxItemCount, status: maxItemCount > 0 ? "running" : "complete" });
    // A finished re-harvest can add references to the model. Only tree nodes the model actually holds are adopted; a brand-new GUID joins the cache queue, new nodes of an already-finished GUID reuse its result.
    function rescanForNewCandidates(): void {
        if (!isStopped()) {
            const newGuids: string[] = [];
            collectEnrichmentGuidLookup(referenceModel).forEach((treeNodeIds, guid) => {
                const fresh = treeNodeIds.filter((treeNodeId) => nodesById.has(treeNodeId) && !guidByTreeNodeId.has(treeNodeId));
                const known = guidLookup.get(guid);
                if (fresh.length > 0) {
                    fresh.forEach((treeNodeId) => guidByTreeNodeId.set(treeNodeId, guid));
                    candidateTreeNodeIds.push(...fresh);
                    if (known) {
                        known.push(...fresh);
                        const finished = resultByGuid.get(guid);
                        if (finished) {
                            if (finished.value)
                                mergeEnrichedItem(new Map([[guid, itemsFor(fresh, nodesById)]]), guid, finished.value);
                            void publish(fresh, finished.status);
                        }
                    }
                    else {
                        guidLookup.set(guid, fresh);
                        newGuids.push(guid);
                        void publish(fresh, "pending");
                    }
                }
            });
            if (newGuids.length > 0) {
                cacheQueue.push(...sortGuidsByEnrichmentPriority(newGuids, guidLookup, nodesById));
                maxItemCount += newGuids.length;
                onProgress?.({ completedItemCount, maxItemCount, status: "running" });
            }
        }
    }
    function onHarvestActivity(): void { rescanForNewCandidates(); signal(); }
    const unsubscribeHarvest = harvestActivity?.subscribe(onHarvestActivity);
    workSession.signal.addEventListener("abort", signal, { once: true });
    // Cache queue first, every iteration: a cached value reaches the table before any live read is started. Live reads run in parallel up to maxLiveInFlight and feed back into this loop. The loop ends only when nothing is queued, nothing is in flight, and no re-harvest is pending.
    // The live step is resolved once per run from the runtime setting testing.showJourneyStepLive; when off, no live queue entry is ever created and references stay at their cached (or pending) tier.
    async function runLoop(): Promise<void> {
        await initializeRuntimeSettings();
        const liveStepEnabled = isJourneyStepLiveEnabled();
        if (!liveStepEnabled)
            extensionLog.debug("Reference model processor: live step disabled by runtime setting testing.showJourneyStepLive; references use cached values only", { workSessionId: workSession.id });
        while (!isStopped()) {
            if (cacheQueue.length > 0) {
                const guid = cacheQueue.shift();
                if (guid)
                    await hydrateFromCache(guid, liveStepEnabled);
            }
            else if (liveQueue.length > 0 && inFlight < maxLiveInFlight) {
                const guid = liveQueue.shift();
                if (guid)
                    dispatchLive(guid);
            }
            else if (liveQueue.length === 0 && inFlight === 0 && (harvestActivity?.pendingCount() ?? 0) === 0) {
                break;
            }
            else {
                await nextEvent();
            }
        }
    }
    const completion = runLoop().then(finish);
    function finish(): void {
        const nonTerminal = candidateTreeNodeIds.map((treeNodeId) => ({ treeNodeId, guid: guidByTreeNodeId.get(treeNodeId), processingStatus: processingStateByTreeNodeId.get(treeNodeId) })).filter(({ processingStatus }) => NON_TERMINAL_STATUSES.has(processingStatus));
        extensionLog.debug("Reference model processor diagnostic: completion invariant", { workSessionId: workSession.id, candidateGuidCount: guidLookup.size, candidateTreeNodeCount: candidateTreeNodeIds.length, completedItemCount, nonTerminalCount: nonTerminal.length, nonTerminal });
        if (!isStopped())
            onProgress?.({ completedItemCount, maxItemCount, status: "complete" });
    }
    function recordResult(guid: string, status: ProcessingStatus, value: ItemGraphNodeData | undefined): void { resultByGuid.set(guid, { status, value }); }
    function countCompleted(): void { completedItemCount += 1; onProgress?.({ completedItemCount, maxItemCount, status: "running" }); }
    // Cache hit: show the cached value now (tier "cached") and queue the live check. Cache miss: straight to the live queue at tier "pending" (reference). With the live step off, the item ends here: "cached" on a hit, "pending" on a miss.
    async function hydrateFromCache(guid: string, liveStepEnabled: boolean): Promise<void> {
        const treeNodeIds = guidLookup.get(guid) ?? [];
        if (!isEligibleForResolve(treeNodeIds, nodesById)) {
            await publish(treeNodeIds, "enriched");
            recordResult(guid, "enriched", undefined);
            countCompleted();
        }
        else {
            const representative = firstItemNode(treeNodeIds, nodesById);
            const reference = representative?.scItem.scItemId || representative?.scItem.scItemPath;
            let cached: CachedItemFact | undefined;
            try {
                if (reference)
                    cached = await readCachedItemFact(keyFor(reference));
            }
            catch (error) {
                extensionLog.warn("Reference model processor: cache read failed, treating as a miss", { guid, reference, error });
            }
            if (!isStopped()) {
                const snapshots = new Map<ItemGraphNodeData, ItemSnapshot>();
                const items = itemsFor(treeNodeIds, nodesById);
                items.forEach((item) => snapshots.set(item, snapshotOf(item)));
                workByGuid.set(guid, { reference, cached, snapshots });
                if (cached?.value) {
                    mergeEnrichedItem(new Map([[guid, items]]), guid, cached.value);
                    await publish(treeNodeIds, "cached");
                }
                if (liveStepEnabled) {
                    liveQueue.push(guid);
                }
                else {
                    recordResult(guid, cached?.value ? "cached" : "pending", cached?.value);
                    countCompleted();
                }
            }
        }
    }
    function dispatchLive(guid: string): void {
        inFlight += 1;
        activeGuids.add(guid);
        void runLive(guid).catch((error: unknown) => extensionLog.warn("Reference model processor: live run rejected", { guid, error })).finally(() => { inFlight -= 1; activeGuids.delete(guid); lastProgressAt = performance.now(); signal(); });
    }
    // Cached values are display-only: whatever the live read says replaces them, and a failed or not-found read removes them.
    function restoreSnapshots(work: GuidWork | undefined): void { work?.snapshots.forEach((snapshot, item) => Object.assign(item, snapshot)); }
    async function runLive(guid: string): Promise<void> {
        const treeNodeIds = guidLookup.get(guid) ?? [];
        const work = workByGuid.get(guid);
        const reference = work?.reference;
        let status: ProcessingStatus = "failed";
        let value: ItemGraphNodeData | undefined;
        try {
            if (!work?.cached?.value)
                await publish(treeNodeIds, "enriching");
            if (reference) {
                const outcome = await verifyItemFact(keyFor(reference), work?.cached, () => requestResolve(reference));
                if (!isStopped()) {
                    restoreSnapshots(work);
                    status = applyResolveOutcome(guid, treeNodeIds, outcome);
                    value = outcome.kind === "not-found" || outcome.kind === "failed" ? undefined : outcome.value;
                    extensionLog.debug("Reference model processor: resolve outcome", { guid, reference, outcome: outcome.kind, terminalStatus: status, hadCachedValue: Boolean(work?.cached?.value), treeNodeIds });
                    if (outcome.kind === "revision-mismatch" && outcome.hadStructuralCache) {
                        onStaleStructural?.(reference, treeNodeIds, (succeeded) => {
                            if (!isStopped()) {
                                recordResult(guid, succeeded ? "enriched" : "failed", value);
                                void publish(guidLookup.get(guid) ?? treeNodeIds, succeeded ? "enriched" : "failed");
                            }
                        });
                    }
                }
            }
        }
        catch (error) {
            status = "failed";
            value = undefined;
            restoreSnapshots(work);
            extensionLog.warn("Reference model processor: candidate became unable to process", { guid, reference, treeNodeIds, error });
        }
        finally {
            if (!isStopped()) {
                recordResult(guid, status, value);
                await publish(guidLookup.get(guid) ?? treeNodeIds, status);
                countCompleted();
            }
        }
    }
    async function requestResolve(reference: string): Promise<WorkerTaskExecutionResult> {
        const task: Omit<Extract<WorkerTask, {
            type: "get-quick-info";
        }>, "requestId"> = { taskId: crypto.randomUUID(), type: "get-quick-info", url: buildFoblesUrl(reference), requested: createSitecoreItemLocator(reference) };
        try {
            const result = await workSession.runTask(task);
            return result ?? createErrorResult({ ...task, requestId: workSession.id }, "No response from worker pool");
        }
        catch (error) {
            if (!disposed)
                extensionLog.warn("Reference model processor: resolve task failed", { task, error });
            return createErrorResult({ ...task, requestId: workSession.id }, error instanceof Error ? error.message : "Resolve task failed");
        }
    }
    function applyResolveOutcome(guid: string, treeNodeIds: string[], outcome: ResolveOutcome): ProcessingStatus {
        if (outcome.kind !== "not-found" && outcome.kind !== "failed")
            mergeEnrichedItem(new Map([[guid, itemsFor(treeNodeIds, nodesById)]]), guid, outcome.value);
        return outcome.kind;
    }
    return { completion, getHealth, dispose: () => { disposed = true; activeGuids.clear(); cacheQueue.length = 0; liveQueue.length = 0; unsubscribeHarvest?.(); unregisterHealth(); signal(); } };
}
