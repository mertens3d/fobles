import type { PoolCancelRequestMessage, PoolCancelTaskMessage, PoolDisposeMessage, PoolRunTaskMessage, WorkerAdoptedMessage, WorkerIframeReadyMessage, WorkerPoolStatusMessage, WorkerReadyMessage } from "../content/foundation/workers/transport/transport.types";
import type { PersistedLogMessage } from "../shared/persisted-log.types";

export type UtilityOwner = { tabId: number; ownershipId: string; origin: string };

export type SpecialistFeature = "reference-graph" | "auditor";

export type ActiveSpecialist = { feature: SpecialistFeature; hostTabId: number };

export type ReferenceGraphLockMessage =
  { type: "FOBLES_REFERENCE_GRAPH_LOCK_ACQUIRE" } | { type: "FOBLES_REFERENCE_GRAPH_LOCK_RELEASE" };

export type AuditorLockMessage = { type: "FOBLES_AUDITOR_LOCK_ACQUIRE" } | { type: "FOBLES_AUDITOR_LOCK_RELEASE" };

export type RuntimeMessage =
  | RuntimeReloadMessage
  | ReferenceGraphLockMessage
  | AuditorLockMessage
  | PoolRunTaskMessage
  | PoolCancelRequestMessage
  | PoolCancelTaskMessage
  | PoolDisposeMessage
  | WorkerPoolStatusMessage
  | WorkerReadyMessage
  | WorkerIframeReadyMessage
  | WorkerAdoptedMessage
  | PersistedLogMessage;

export interface RuntimeReloadMessage {
  action: string;
}
