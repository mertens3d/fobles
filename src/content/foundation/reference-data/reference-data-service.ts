// @source-path [fobles] src/content/foundation/reference-data/reference-data-service.ts

import { getReferenceGraphFilters } from "../../../shared/reference-graph-settings";
import type { WorkSession } from "../workers/session/work-session.types";
import type {
  HarvestProgressCallback,
  HarvestProgressStatus,
  SitecoreHarvestFiltersState,
  StepKey,
} from "../harvesting/sitecore-harvester.types";
import { PROGRESS_STEPS } from "../harvesting/planner/harvest-steps";
import type { PreparedReferenceModel } from "./acquisition/prepare-reference-model";
import { startSharedReferenceModelSession, type ReferenceModelSessionStateChange, type SharedReferenceModelSession } from "./processing/reference-model-session";
import type { ReferenceModelProcessingProgress } from "./processing/reference-model-processing.types";
import type { PhaseProgress } from "./progress/lifecycle.types";
import type { ReferenceModelHarvestProgress } from "./processing/reference-model-harvest-queue";

export type FoblesDataFlavor = "reference-model";

export type FoblesDataRequest = {
  flavor: FoblesDataFlavor;
  target: "current-object";
  doc: Document;
  workSession: WorkSession;
  signal: AbortSignal;
  filters?: SitecoreHarvestFiltersState;
  // Optional pass-through for a consumer that renders its own acquisition UI (Reference Graph's step dialog).
  onAcquireProgress?: HarvestProgressCallback;
  onHarvestRequired?: () => void;
  // Called once the model exists and before processing starts, so a consumer can derive its own view of it.
  onModelReady?: (model: PreparedReferenceModel) => void;
};

export type FoblesReferenceModelData = {
  itemId: string;
  model: PreparedReferenceModel;
  resolveCandidateTreeNodeIds: ReadonlySet<string>;
  cacheRevalidationResultByTreeNodeId: ReadonlyMap<string, "passed" | "error">;
};

export type FoblesDataSession = {
  data: FoblesReferenceModelData;
  completion: Promise<void>;
  subscribeChange: (listener: ReferenceModelSessionStateChange) => () => void;
  subscribeProcessingProgress: (listener: (progress: ReferenceModelProcessingProgress) => void) => () => void;
  subscribeHarvestProgress: (listener: (progress: ReferenceModelHarvestProgress) => void) => () => void;
  dispose: () => void;
};

// Progress of the live harvest that runs BEFORE a data session exists (a cold item with no usable cache).
// A consumer can subscribe by work-session id as soon as the work session is created, and a late subscriber
// receives the latest snapshot immediately.
export type FoblesAcquisitionProgress = {
  harvestRequired: boolean;
  progress: PhaseProgress;
};

type AcquisitionProgressListener = (progress: FoblesAcquisitionProgress) => void;

type AcquisitionState = {
  harvestRequired: boolean;
  finished: boolean;
  statusByStepKey: Map<StepKey, HarvestProgressStatus>;
  listeners: Set<AcquisitionProgressListener>;
};

const dataSessionsByWorkSessionId = new Map<string, FoblesDataSession>();
const acquisitionByWorkSessionId = new Map<string, AcquisitionState>();

function getAcquisitionState(workSessionId: string): AcquisitionState {
  let state = acquisitionByWorkSessionId.get(workSessionId);

  if (!state) {
    state = { harvestRequired: false, finished: false, statusByStepKey: new Map(), listeners: new Set() };
    acquisitionByWorkSessionId.set(workSessionId, state);
  }

  return state;
}

function computeAcquisitionProgress(state: AcquisitionState): FoblesAcquisitionProgress {
  const max = PROGRESS_STEPS.length;
  const settledStepCount = Array.from(state.statusByStepKey.values())
    .filter((status) => status === "complete" || status === "skipped")
    .length;
  const completed = state.finished ? max : Math.min(settledStepCount, max);
  const status: PhaseProgress["status"] = completed >= max
    ? "complete"
    : state.statusByStepKey.size > 0
      ? "running"
      : "idle";

  return { harvestRequired: state.harvestRequired, progress: { completed, max, status } };
}

function publishAcquisitionProgress(state: AcquisitionState): void {
  const snapshot = computeAcquisitionProgress(state);

  state.listeners.forEach((listener) => listener(snapshot));
}

export function subscribeFoblesAcquisitionProgress(
  workSessionId: string,
  listener: AcquisitionProgressListener,
): () => void {
  const state = getAcquisitionState(workSessionId);

  state.listeners.add(listener);

  if (state.harvestRequired || state.statusByStepKey.size > 0) listener(computeAcquisitionProgress(state));

  return () => {
    state.listeners.delete(listener);

    // A run that never needed a live harvest leaves nothing worth keeping once its last subscriber is gone.
    if (state.listeners.size === 0 && state.finished && !dataSessionsByWorkSessionId.has(workSessionId)) {
      acquisitionByWorkSessionId.delete(workSessionId);
    }
  };
}

export function getFoblesDataSession(workSessionId: string): FoblesDataSession | undefined {
  return dataSessionsByWorkSessionId.get(workSessionId);
}

export async function openFoblesDataSession(request: FoblesDataRequest): Promise<FoblesDataSession | undefined> {
  const workSessionId = request.workSession.id;
  const acquisition = getAcquisitionState(workSessionId);

  dataSessionsByWorkSessionId.get(workSessionId)?.dispose();

  const filters = request.filters ?? await getReferenceGraphFilters();

  const source: SharedReferenceModelSession | undefined = await startSharedReferenceModelSession({
    doc: request.doc,
    workSession: request.workSession,
    filters,
    signal: request.signal,
    onModelReady: request.onModelReady,
    onAcquireProgress: (step, status) => {
      acquisition.statusByStepKey.set(step.stepKey, status);
      publishAcquisitionProgress(acquisition);
      request.onAcquireProgress?.(step, status);
    },
    onHarvestRequired: () => {
      acquisition.harvestRequired = true;
      publishAcquisitionProgress(acquisition);
      request.onHarvestRequired?.();
    },
  });

  if (!source || request.signal.aborted) {
    source?.dispose();
    acquisitionByWorkSessionId.delete(workSessionId);

    return undefined;
  }

  // Acquisition is over once the session exists, even if a step never reported a terminal status.
  acquisition.finished = true;
  publishAcquisitionProgress(acquisition);

  const session: FoblesDataSession = {
    data: {
      itemId: source.itemId,
      model: source.prepared,
      resolveCandidateTreeNodeIds: source.resolveCandidateTreeNodeIds,
      cacheRevalidationResultByTreeNodeId: source.cacheRevalidationResultByTreeNodeId,
    },
    completion: source.processingCompletion,
    subscribeChange: source.subscribeStateChange,
    subscribeProcessingProgress: source.subscribeProcessingProgress,
    subscribeHarvestProgress: source.subscribeHarvestProgress,
    dispose: () => {
      source.dispose();
      acquisition.listeners.clear();
      acquisitionByWorkSessionId.delete(workSessionId);

      if (dataSessionsByWorkSessionId.get(workSessionId) === session) dataSessionsByWorkSessionId.delete(workSessionId);
    },
  };

  dataSessionsByWorkSessionId.set(workSessionId, session);

  return session;
}
