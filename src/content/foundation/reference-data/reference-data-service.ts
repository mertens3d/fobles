// @source-path [fobles] src/content/foundation/reference-data/reference-data-service.ts

import type { AcquisitionProgressListener, AcquisitionState, FoblesAcquisitionProgress, FoblesDataRequest, FoblesDataSession } from "./reference-data.types.ts";
import { PROGRESS_STEPS } from "../harvesting/planner/harvest-steps";
import type { SharedReferenceModelSession } from "./processing/processing.types.ts";
import { startSharedReferenceModelSession } from "./processing/session/reference-model-session.ts";
import type { PhaseProgress } from "./progress/lifecycle.types.ts";
import { WORK_PROGRESS } from "../workers/progress/work-progress.const.ts";
import type { WorkSession } from "../workers/session/work-session.types.ts";

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

// Agent: Acquisition is the first phase of the work session's progress. A cache hit has no acquisition work to count,
// Agent: so it only reports running/complete; a cold item counts its harvest steps.
function reportAcquisitionProgress(workSession: WorkSession, state: AcquisitionState): void {
  const { harvestRequired, progress } = computeAcquisitionProgress(state);
  const status = state.finished ? "complete" : "running";
  workSession.reportProgress(
    WORK_PROGRESS.PHASE.ACQUIRE,
    harvestRequired ? progress : { completed: 0, max: 0, status },
  );
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
  reportAcquisitionProgress(request.workSession, acquisition);

  const source: SharedReferenceModelSession | undefined = await startSharedReferenceModelSession({
    doc: request.doc,
    workSession: request.workSession,
    filters: request.filters,
    signal: request.signal,
    onModelReady: request.onModelReady,
    onAcquireProgress: (step, status) => {
      acquisition.statusByStepKey.set(step.stepKey, status);
      publishAcquisitionProgress(acquisition);
      reportAcquisitionProgress(request.workSession, acquisition);
      request.onAcquireProgress?.(step, status);
    },
    onHarvestRequired: () => {
      acquisition.harvestRequired = true;
      publishAcquisitionProgress(acquisition);
      reportAcquisitionProgress(request.workSession, acquisition);
      request.onHarvestRequired?.();
    },
  });

  if (!source || request.signal.aborted) {
    acquisition.finished = true;
    reportAcquisitionProgress(request.workSession, acquisition);
    source?.dispose();
    acquisitionByWorkSessionId.delete(workSessionId);
    return undefined;
  }

  acquisition.finished = true;
  publishAcquisitionProgress(acquisition);
  reportAcquisitionProgress(request.workSession, acquisition);

  const session: FoblesDataSession = {
    data: {
      itemId: source.itemId,
      model: source.prepared,
      referenceHarvestingCandidateTreeNodeIds: source.referenceHarvestingCandidateTreeNodeIds,
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
