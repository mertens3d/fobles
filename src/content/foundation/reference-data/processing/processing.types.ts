import type { SitecoreHarvestFiltersState } from "../../../../constants/_base/_base.types";
import type { SitecoreDataFactName } from "../../cache/sitecore-data/sitecore-data.types";
import type { HealthReport } from "../../diagnostics/diagnostics.types";
import type { HarvestProgressCallback, SitecoreHarvestResult } from "../../harvesting/sitecore-harvester.types";
import type { WorkSession } from "../../workers/session/work-session.types";
import type { SitecoreItemLocator } from "../../workers/tasks/worker-task.types";
import type { PreparedReferenceModel } from "../acquisition/acquisition.types";
import type { ReferenceModelNode } from "../model/model.types";
import type { ItemGraphNodeData } from "../model/model.types";

export type ProcessingStatus =
  | "pending"
  | "cached"
  | "enriching"
  | "enriched"
  | "verified"
  | "revision-mismatch"
  | "unverified"
  | "not-found"
  | "failed";

export type ProcessingStateByTreeNodeId = Map<string, ProcessingStatus>;

export type ReferenceHarvestingJob = { item: SitecoreItemLocator; factName: SitecoreDataFactName };

export type ReferenceHarvestingProgress = { completed: number; max: number; status: "running" | "complete" };

export type ReferenceHarvestingQueueOptions = {
  runJob: (job: ReferenceHarvestingJob, signal: AbortSignal) => Promise<void>;
  onProgress?: (progress: ReferenceHarvestingProgress) => void;
  onError?: (job: ReferenceHarvestingJob, error: unknown) => void;
};

export type QueuedReferenceHarvestingJob = ReferenceHarvestingJob & { onSettled?: (succeeded: boolean) => void };

export type ReferenceHarvestingQueue = {
  enqueue: (job: ReferenceHarvestingJob, onSettled?: (succeeded: boolean) => void) => void;
  remove: (predicate: (job: ReferenceHarvestingJob) => boolean) => number;
  pendingCount: () => number;
  dispose: () => void;
};

export type ReferenceModelHarvestProgress = { completed: number; max: number; status: "running" | "complete" };

export type ReferenceModelHarvestQueueOptions = {
  runHarvest: (reference: string, signal: AbortSignal) => Promise<void>;
  onProgress?: (progress: ReferenceModelHarvestProgress) => void;
  onError?: (reference: string, error: unknown) => void;
};

export type ReferenceModelHarvestJob = { reference: string; onSettled?: (succeeded: boolean) => void };

export type ReferenceModelHarvestQueue = {
  // No-op if `reference` is already queued, active, or settled in this queue's lifetime.
  // Jobs added while processing are appended and consumed by the same queue lifecycle.
  enqueue: (reference: string, onSettled?: (succeeded: boolean) => void) => void;
  dispose: () => void;
};

export type ReferenceModelProcessingProgress = {
  completedItemCount: number;
  maxItemCount: number;
  status: "idle" | "running" | "complete";
};

export type ReferenceModelProcessingController = {
  completion: Promise<void>;
  dispose: () => void;
  getHealth: () => HealthReport;
};

export type ReferenceModelProcessingPriorityRank = 0 | 1 | 2;

export type ReferenceModelProcessingStateChange = (
  treeNodeIds: readonly string[],
  status: ProcessingStatus,
  stateByTreeNodeId: ProcessingStateByTreeNodeId,
) => void | Promise<void>;

export type ReferenceModelHarvestActivity = {
  pendingCount: () => number;
  subscribe: (listener: () => void) => () => void;
};

export type StartReferenceModelProcessorOptions = {
  doc: Document;
  workSession: WorkSession;
  referenceModel: ReferenceModelNode;
  nodesById: Map<string, ReferenceModelNode>;
  processingStateByTreeNodeId: ProcessingStateByTreeNodeId;
  onStateChange?: ReferenceModelProcessingStateChange;
  onStaleStructural?: (
    reference: string,
    treeNodeIds: readonly string[],
    setTerminalState: (succeeded: boolean) => void,
  ) => void;
  onProgress?: (progress: ReferenceModelProcessingProgress) => void;
  harvestActivity?: ReferenceModelHarvestActivity;
  maxLiveInFlight?: number;
};

export type ItemSnapshot = Pick<
  ItemGraphNodeData,
  "scItemId" | "scItemName" | "scItemPath" | "scTemplate" | "scItemIcon" | "rawMarkup" | "link"
>;

export type GuidWork = {
  reference: string | undefined;
  cached: CachedItemFact | undefined;
  snapshots: Map<ItemGraphNodeData, ItemSnapshot>;
};

export type GuidResult = { status: ProcessingStatus; value: ItemGraphNodeData | undefined };

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
  updateFilters: (filters: SitecoreHarvestFiltersState) => void;
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

export type ResolveOutcome =
  | { kind: "enriched"; value: ItemGraphNodeData }
  | { kind: "verified"; value: ItemGraphNodeData }
  | { kind: "revision-mismatch"; value: ItemGraphNodeData; hadStructuralCache: boolean }
  | { kind: "unverified"; value: ItemGraphNodeData }
  | { kind: "not-found" }
  | { kind: "failed" };

export type CachedItemFact = {
  value: ItemGraphNodeData | undefined;
  revision: string | undefined;
  hadStructuralCache: boolean;
};
