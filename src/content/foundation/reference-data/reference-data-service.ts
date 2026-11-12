import type { AcquisitionProgressListener, AcquisitionState, FoblesAcquisitionProgress, FoblesDataRequest, FoblesDataSession } from "./reference-data.types.js";
// @source-path [fobles] src/content/foundation/reference-data/reference-data-service.ts

import { PROGRESS_STEPS } from "../harvesting/planner/harvest-steps";
import type { SharedReferenceModelSession } from "./processing/processing.types";
import { startSharedReferenceModelSession } from "./processing/reference-model-session";
import type { PhaseProgress } from "./progress/lifecycle.types";

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
  const settledStepCount = Array.from(state.statusByStepKey.values()).filter(
    (status) => status === "complete" || status === "skipped",
  ).length;
  const completed = state.finished ? max : Math.min(settledStepCount, max);
  const status: PhaseProgress["status"] =
    completed >= max ? "complete" : state.statusByStepKey.size > 0 ? "running" : "idle";
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
  if (state.harvestRequired || state.statusByStepKey.size > 0) {
    listener(computeAcquisitionProgress(state));
  }
  return () => {
    state.listeners.delete(listener);
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
      if (dataSessionsByWorkSessionId.get(workSessionId) === session) {
        dataSessionsByWorkSessionId.delete(workSessionId);
      }
    },
  };

  dataSessionsByWorkSessionId.set(workSessionId, session);
  return session;
}
