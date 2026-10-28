// import type { SPECIALIST_LOCK } from "../constants/specialist-lock.const";
// import type {
//   PoolCancelRequestMessage,
//   PoolCancelTaskMessage,
//   PoolDisposeMessage,
//   PoolRunTaskMessage,
//   WorkerAdoptedMessage,
//   WorkerIframeReadyMessage,
//   WorkerReadyMessage,
// } from "../content/foundation/workers/transport/worker.messages";
// import type { PersistedLogMessage } from "../shared/persisted-log.types";

// export type SpecialistFeature = "reference-graph" | "auditor";

// export type ActiveSpecialist = { feature: SpecialistFeature; hostTabId: number };

// export type ReferenceGraphLockMessage =
//   | { type: typeof SPECIALIST_LOCK.REFERENCE_GRAPH.ACQUIRE }
//   | { type: typeof SPECIALIST_LOCK.REFERENCE_GRAPH.RELEASE };

// export type AuditorLockMessage =
//   | { type: typeof SPECIALIST_LOCK.AUDITOR.ACQUIRE }
//   | { type: typeof SPECIALIST_LOCK.AUDITOR.RELEASE };

// export interface RuntimeReloadMessage {
//   action: string;
// }

// export type RuntimeMessage =
//   | RuntimeReloadMessage
//   | ReferenceGraphLockMessage
//   | AuditorLockMessage
//   | PoolRunTaskMessage
//   | PoolCancelRequestMessage
//   | PoolCancelTaskMessage
//   | PoolDisposeMessage
//   | WorkerReadyMessage
//   | WorkerIframeReadyMessage
//   | WorkerAdoptedMessage
//   | PersistedLogMessage;
