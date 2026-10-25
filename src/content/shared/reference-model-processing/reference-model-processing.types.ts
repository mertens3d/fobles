import type { HealthReport } from "../../shell/health/health.types";
// @source-path [fobles] src/content/shared/reference-model-processing/reference-model-processing.types.ts
import type { ProcessingStateByTreeNodeId, ProcessingStatus } from "./processing-state";
export type ReferenceModelProcessingProgress = { completedItemCount: number; maxItemCount: number; status: "idle" | "running" | "complete"; };
export type ReferenceModelProcessingController = { completion: Promise<void>; dispose: () => void; getHealth: () => HealthReport; };
export type ReferenceModelProcessingPriorityRank = 0 | 1 | 2;
export type ReferenceModelProcessingStateChange = (treeNodeIds: readonly string[], status: ProcessingStatus, stateByTreeNodeId: ProcessingStateByTreeNodeId) => void | Promise<void>;
