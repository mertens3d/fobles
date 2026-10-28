// @source-path [fobles] src/content/foundation/reference-data/processing/reference-model-session.ts

import { extensionLog } from "../../../logger";
import { buildFoblesUrl } from "../../sitecore/fobles-url";
import { harvestSitecoreWithWorkers } from "../../harvesting/coordinator/foreground-harvest-coordinator";
import type {
  HarvestProgressCallback,
  SitecoreHarvestFiltersState,
  SitecoreHarvestResult,
} from "../../harvesting/sitecore-harvester.types";
import type { WorkSession } from "../../workers/session/work-session.types";
import { acquireReferenceModelForCurrentItem } from "../acquisition/acquire-reference-model";
import type { PreparedReferenceModel } from "../acquisition/prepare-reference-model";
import { collectEnrichmentGuidLookup } from "./resolve-candidate-collector";
import {
  createReferenceHarvestingQueue,
  type ReferenceHarvestingJob,
  type ReferenceHarvestingProgress,
  type ReferenceHarvestingQueue,
} from "./reference-harvesting-queue";
import { patchReferenceModelFact } from "./reference-model-fact-patcher";
import { startReferenceModelProcessor } from "./reference-model-processor";
import type { ReferenceModelProcessingController, ReferenceModelProcessingProgress } from "./reference-model-processing.types";
import type { ProcessingStateByTreeNodeId, ProcessingStatus } from "./processing-state";
import type { SitecoreDataFactMap, SitecoreDataFactName } from "../../cache/sitecore-data/sitecore-data-cache.types";

export type ReferenceModelSessionStateChange = (
  treeNodeIds: readonly string[],
  status: ProcessingStatus,
  state: ProcessingStateByTreeNodeId,
) => void | Promise<void>;

export type SharedReferenceModelSession = {
  itemId: string;
  prepared: PreparedReferenceModel;
  resolveCandidateTreeNodeIds: ReadonlySet<string>;
  cacheRevalidationResultByTreeNodeId: ReadonlyMap<string, "passed" | "error">;
  processingCompletion: Promise<void>;
  subscribeStateChange: (listener: ReferenceModelSessionStateChange) => () => void;
  subscribeProcessingProgress: (listener: (progress: ReferenceModelProcessingProgress) => void) => () => void;
  subscribeHarvestProgress: (listener: (progress: ReferenceHarvestingProgress) => void) => () => void;
  dispose: () => void;
};

export type StartSharedReferenceModelSessionOptions = {
  doc: Document;
  workSession: WorkSession;
  filters: SitecoreHarvestFiltersState;
  signal: AbortSignal;
  onAcquireProgress?: HarvestProgressCallback;
  onHarvestRequired?: () => void;
  onRootRefresh?: (result: SitecoreHarvestResult) => void;
  onModelReady?: (prepared: PreparedReferenceModel) => void;
};

const sessionsByWorkSessionId = new Map<string, SharedReferenceModelSession>();

const FACTS_BY_FILTER: ReadonlyArray<[keyof SitecoreHarvestFiltersState, SitecoreDataFactName]> = [
  ["parent", "parent"],
  ["children", "children"],
  ["referrers", "referrers"],
  ["customFields", "customSections"],
  ["standardFields", "standardSections"],
  ["layouts", "layout"],
];

function filtersForFact(factName: SitecoreDataFactName): SitecoreHarvestFiltersState {
  return {
    parent: factName === "parent",
    children: factName === "children",
    referrers: factName === "referrers",
    customFields: factName === "customSections",
    standardFields: factName === "standardSections",
    layouts: factName === "layout",
    template: factName === "quickInfo",
  };
}

function factFromResult<K extends SitecoreDataFactName>(
  factName: K,
  result: SitecoreHarvestResult,
): SitecoreDataFactMap[K] | undefined {
  const value = factName === "quickInfo"
    ? {
        result: {
          requested: { kind: "id" as const, value: result.rootItem.scItemId },
          status: "found" as const,
          value: result.rootItem,
        },
      }
    : factName === "parent"
      ? { parent: result.parent }
      : factName === "children"
        ? { childItems: result.childItems ?? [] }
        : factName === "referrers"
          ? { referrers: result.referrers ?? [] }
          : factName === "customSections"
            ? { sections: result.customFieldSections ?? [] }
            : factName === "standardSections"
              ? { sections: result.standardFieldSections ?? [] }
              : { layoutSectionFields: result.layoutSectionFields ?? [] };

  return value as SitecoreDataFactMap[K];
}

export function getSharedReferenceModelSession(workSessionId: string): SharedReferenceModelSession | undefined {
  return sessionsByWorkSessionId.get(workSessionId);
}

export async function startSharedReferenceModelSession({
  doc,
  workSession,
  filters,
  signal,
  onAcquireProgress,
  onHarvestRequired,
  onRootRefresh,
  onModelReady,
}: StartSharedReferenceModelSessionOptions): Promise<SharedReferenceModelSession | undefined> {
  sessionsByWorkSessionId.get(workSession.id)?.dispose();

  const acquired = await acquireReferenceModelForCurrentItem(doc, workSession, filters, {
    signal,
    onProgress: onAcquireProgress,
    onHarvestRequired,
  });

  if (!acquired || signal.aborted) return undefined;

  const { itemId, prepared, decision } = acquired;
  onModelReady?.(prepared);

  const stateListeners = new Set<ReferenceModelSessionStateChange>();
  const processingProgressListeners = new Set<(progress: ReferenceModelProcessingProgress) => void>();
  const harvestProgressListeners = new Set<(progress: ReferenceHarvestingProgress) => void>();
  const harvestActivityListeners = new Set<() => void>();

  let latestProcessingProgress: ReferenceModelProcessingProgress | undefined;
  let latestHarvestProgress: ReferenceHarvestingProgress | undefined;

  const cacheRevalidationResultByTreeNodeId = new Map<string, "passed" | "error">();
  const guidLookup = collectEnrichmentGuidLookup(prepared.referenceModel);
  const resolveCandidateTreeNodeIds = new Set<string>(Array.from(guidLookup.values()).flat());

  let disposed = false;

  const harvestingQueue: ReferenceHarvestingQueue = createReferenceHarvestingQueue({
    runJob: async (job: ReferenceHarvestingJob, harvestSignal: AbortSignal) => {
      const result = await harvestSitecoreWithWorkers(
        {
          requestId: crypto.randomUUID(),
          url: buildFoblesUrl(job.reference),
          filters: filtersForFact(job.factName),
        },
        { signal: harvestSignal },
      );

      if (!result) throw new Error(`Reference Harvesting produced no ${job.factName} fact for ${job.reference}`);

      const value = factFromResult(job.factName, result);

      if (!value) throw new Error(`Reference Harvesting could not map ${job.factName} for ${job.reference}`);

      const changedTreeNodeIds = patchReferenceModelFact(prepared, job.reference, job.factName, value);

      for (const listener of stateListeners) {
        await listener(changedTreeNodeIds, "enriched", prepared.processingStateByTreeNodeId);
      }

      if (job.reference === itemId) onRootRefresh?.(prepared.harvestedData);

      harvestActivityListeners.forEach((listener) => listener());
    },
    onProgress: (progress) => {
      latestHarvestProgress = progress;
      harvestProgressListeners.forEach((listener) => listener(progress));
      harvestActivityListeners.forEach((listener) => listener());
    },
    onError: (job, error) => {
      extensionLog.warn("Reference Harvesting job failed", { workSessionId: workSession.id, job, error });
    },
  });

  const rootFacts = FACTS_BY_FILTER.filter(([filter]) => filters[filter]).map(([, factName]) => factName);

  if (decision.kind === "harvest-required" || decision.kind === "cache-then-reharvest") {
    rootFacts.forEach((factName) => harvestingQueue.enqueue({ reference: itemId, factName }));
  }

  const processor: ReferenceModelProcessingController = startReferenceModelProcessor({
    doc,
    workSession,
    referenceModel: prepared.referenceModel,
    nodesById: prepared.nodesById,
    processingStateByTreeNodeId: prepared.processingStateByTreeNodeId,
    onStateChange: async (treeNodeIds, status, state) => {
      for (const listener of stateListeners) {
        await listener(treeNodeIds, status, state);
      }
    },
    onStaleStructural: (reference, treeNodeIds, setTerminalState) => {
      const requiredFacts = rootFacts;

      if (requiredFacts.length === 0) {
        setTerminalState(true);
        return;
      }

      let remaining = requiredFacts.length;
      let succeeded = true;

      requiredFacts.forEach((factName) => {
        harvestingQueue.enqueue({ reference, factName }, (jobSucceeded) => {
          succeeded &&= jobSucceeded;
          remaining -= 1;

          if (remaining === 0) {
            treeNodeIds.forEach((treeNodeId) => {
              cacheRevalidationResultByTreeNodeId.set(treeNodeId, succeeded ? "passed" : "error");
            });

            setTerminalState(succeeded);
          }
        });
      });
    },
    onProgress: (progress) => {
      latestProcessingProgress = progress;
      processingProgressListeners.forEach((listener) => listener(progress));
    },
    harvestActivity: {
      pendingCount: harvestingQueue.pendingCount,
      subscribe: (listener) => {
        harvestActivityListeners.add(listener);
        return () => harvestActivityListeners.delete(listener);
      },
    },
  });

  const session: SharedReferenceModelSession = {
    itemId,
    prepared,
    resolveCandidateTreeNodeIds,
    cacheRevalidationResultByTreeNodeId,
    processingCompletion: processor.completion,
    subscribeStateChange: (listener) => {
      stateListeners.add(listener);
      return () => stateListeners.delete(listener);
    },
    subscribeProcessingProgress: (listener) => {
      processingProgressListeners.add(listener);
      if (latestProcessingProgress) listener(latestProcessingProgress);
      return () => processingProgressListeners.delete(listener);
    },
    subscribeHarvestProgress: (listener) => {
      harvestProgressListeners.add(listener);
      if (latestHarvestProgress) listener(latestHarvestProgress);
      return () => harvestProgressListeners.delete(listener);
    },
    dispose: () => {
      if (disposed) return;

      disposed = true;
      processor.dispose();
      harvestingQueue.dispose();
      stateListeners.clear();
      processingProgressListeners.clear();
      harvestProgressListeners.clear();
      harvestActivityListeners.clear();

      if (sessionsByWorkSessionId.get(workSession.id) === session) {
        sessionsByWorkSessionId.delete(workSession.id);
      }
    },
  };

  sessionsByWorkSessionId.set(workSession.id, session);

  return session;
}