// @source-path [fobles] src/content/features/auditor/audit-runner.ts
import { getReferenceGraphFilters } from "../../../shared/reference-graph-settings";
import { extensionLog } from "../../logger";
import { buildFoblesUrl } from "../augmentor/helper";
import { harvestSitecoreWithWorkers } from "../../sitecore-harvester/coordinator/foreground-harvest-coordinator";
import type { SitecoreHarvestFiltersState } from "../../sitecore-harvester/sitecore-harvester.types";
import type { WorkSession } from "../../shell/work-session/work-session.types";
import { startReferenceModelProcessor } from "../../shared/reference-model-processing/reference-model-processor";
import type { ReferenceModelProcessingController } from "../../shared/reference-model-processing/reference-model-processing.types";
import { collectEnrichmentGuidLookup } from "../../shared/reference-model-processing/resolve-candidate-collector";
import type { ProcessingStateByTreeNodeId } from "../../shared/reference-model-processing/processing-state";
import { acquireReferenceModelForCurrentItem } from "../reference-graph/lifecycle/acquire-reference-model";
import { createHarvestQueue, type HarvestQueue } from "../reference-graph/lifecycle/harvest-queue";
import type { AuditCheckContext } from "./audit-check.types";
import type { AuditFindingStore } from "./audit-finding-store";
import { cacheValidationCheck } from "./checks/cache-validation-check";
import { itemNavigationCheck } from "./checks/item-navigation-check";
import { itemResolvedCheck } from "./checks/item-resolved-check";
import { referenceResolvedCheck } from "./checks/reference-resolved-check";
export type AuditRunnerOptions = { doc: Document; findingStore: AuditFindingStore; workSession: WorkSession; onError?: (error: unknown) => void; };
export type AuditRunner = { run: () => Promise<void>; dispose: () => void; };
export function createAuditRunner({ doc, findingStore, workSession, onError }: AuditRunnerOptions): AuditRunner {
  let harvestQueue: HarvestQueue | undefined;
  let processor: ReferenceModelProcessingController | undefined;
  let disposed = false;
  function dispose(): void { if (disposed) return; disposed = true; processor?.dispose(); harvestQueue?.dispose(); }
  async function run(): Promise<void> {
    try {
      const filters = await getReferenceGraphFilters();
      const acquired = await acquireReferenceModelForCurrentItem(doc, filters, { signal: workSession.signal });
      if (disposed || workSession.signal.aborted || !acquired) return;
      const { prepared } = acquired;
      const referenceModelRoot = prepared.referenceModel;
      const referenceModelNodesById = prepared.nodesById;
      const processingStateByTreeNodeId: ProcessingStateByTreeNodeId = prepared.processingStateByTreeNodeId;
      const cacheRevalidationResultByTreeNodeId = new Map<string, "passed" | "error">();
      const guidLookup = collectEnrichmentGuidLookup(referenceModelRoot);
      const resolveCandidateTreeNodeIds = new Set<string>(Array.from(guidLookup.values()).flat());
      function buildContext(): AuditCheckContext { return { signal: workSession.signal, referenceModelRoot, referenceModelNodesById, findingStore, processingStateByTreeNodeId, resolveCandidateTreeNodeIds, cacheRevalidationResultByTreeNodeId, buildSitecoreUrl: buildFoblesUrl }; }
      async function publishChecks(): Promise<void> { await referenceResolvedCheck.run(buildContext()); await cacheValidationCheck.run(buildContext()); }
      await itemResolvedCheck.run(buildContext());
      await itemNavigationCheck.run(buildContext());
      harvestQueue = createHarvestQueue({ runHarvest: (reference, signal) => runBackgroundHarvest(reference, filters, signal), onError: (reference, error) => extensionLog.warn("Auditor harvest queue: item failed", { reference, error }) });
      processor = startReferenceModelProcessor({ doc, workSession, referenceModel: referenceModelRoot, nodesById: referenceModelNodesById, processingStateByTreeNodeId, onStateChange: () => publishChecks(), onStaleStructural: (reference, treeNodeIds, setTerminalState) => harvestQueue?.enqueue(reference, (succeeded) => { treeNodeIds.forEach((treeNodeId) => cacheRevalidationResultByTreeNodeId.set(treeNodeId, succeeded ? "passed" : "error")); setTerminalState(succeeded); void publishChecks(); }) });
      await processor.completion;
      if (!disposed && !workSession.signal.aborted) { await publishChecks(); await workSession.complete(); }
    } catch (error) { if (!disposed && !workSession.signal.aborted) onError?.(error); }
  }
  async function runBackgroundHarvest(reference: string, filters: SitecoreHarvestFiltersState, signal: AbortSignal): Promise<void> { await harvestSitecoreWithWorkers({ requestId: crypto.randomUUID(), url: buildFoblesUrl(reference), filters }, { signal }); }
  return { run, dispose };
}
