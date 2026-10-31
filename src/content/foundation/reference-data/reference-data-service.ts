// @source-path [fobles] src/content/foundation/reference-data/reference-data-service.ts

import type { WorkSession } from "../workers/session/work-session.types";
import type { HarvestProgressCallback, HarvestProgressStatus, SitecoreHarvestFiltersState, StepKey } from "../harvesting/sitecore-harvester.types";
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
  filters: SitecoreHarvestFiltersState;
  onAcquireProgress?: HarvestProgressCallback;
  onHarvestRequired?: () => void;
  onModelReady?: (model: PreparedReferenceModel) => void;
};
export type FoblesReferenceModelData = { itemId: string; model: PreparedReferenceModel; resolveCandidateTreeNodeIds: ReadonlySet<string>; cacheRevalidationResultByTreeNodeId: ReadonlyMap<string, "passed" | "error"> };
export type FoblesDataSession = { data: FoblesReferenceModelData; completion: Promise<void>; subscribeChange: (listener: ReferenceModelSessionStateChange) => () => void; subscribeProcessingProgress: (listener: (progress: ReferenceModelProcessingProgress) => void) => () => void; subscribeHarvestProgress: (listener: (progress: ReferenceModelHarvestProgress) => void) => () => void; updateFilters: (filters: SitecoreHarvestFiltersState) => void; dispose: () => void };
export type FoblesAcquisitionProgress = { harvestRequired: boolean; progress: PhaseProgress };
type AcquisitionProgressListener = (progress: FoblesAcquisitionProgress) => void;
type AcquisitionState = { harvestRequired: boolean; finished: boolean; statusByStepKey: Map<StepKey, HarvestProgressStatus>; listeners: Set<AcquisitionProgressListener> };

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
  const settledStepCount = Array.from(state.statusByStepKey.values()).filter((status) => status === "complete" || status === "skipped").length;
  const completed = state.finished ? max : Math.min(settledStepCount, max);
  const status: PhaseProgress["status"] = completed >= max ? "complete" : state.statusByStepKey.size > 0 ? "running" : "idle";
  return { harvestRequired: state.harvestRequired, progress: { completed, max, status } };
}

function publishAcquisitionProgress(state: AcquisitionState): void {
  const snapshot = computeAcquisitionProgress(state);
  state.listeners.forEach((listener) => listener(snapshot));
}

export function subscribeFoblesAcquisitionProgress(workSessionId: string, listener: AcquisitionProgressListener): () => void {
  const state = getAcquisitionState(workSessionId);
  state.listeners.add(listener);
  if (state.harvestRequired || state.statusByStepKey.size > 0) listener(computeAcquisitionProgress(state));
  return () => {
    state.listeners.delete(listener);
    if (state.listeners.size === 0 && state.finished && !dataSessionsByWorkSessionId.has(workSessionId)) acquisitionByWorkSessionId.delete(workSessionId);
  };
}

export function getFoblesDataSession(workSessionId: string): FoblesDataSession | undefined {
  return dataSessionsByWorkSessionId.get(workSessionId);
}

export async function openFoblesDataSession(request: FoblesDataRequest): Promise<FoblesDataSession | undefined> {
  const workSessionId = request.workSession.id;
  const acquisition = getAcquisitionState(workSessionId);
  dataSessionsByWorkSessionId.get(workSessionId)?.dispose();

  const source: SharedReferenceModelSession | undefined = await startSharedReferenceModelSession({
    doc: request.doc,
    workSession: request.workSession,
    filters: request.filters,
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
    updateFilters: source.updateFilters,
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
