import type { HealthReport } from "../../diagnostics/health.types";
// @source-path [fobles] src/content/foundation/reference-data/processing/reference-model-processing.types.ts
import type { ProcessingStateByTreeNodeId, ProcessingStatus } from "./processing-state";
export type ReferenceModelProcessingProgress = { completedItemCount: number; maxItemCount: number; status: "idle" | "running" | "complete"; };
export type ReferenceModelProcessingController = { completion: Promise<void>; dispose: () => void; getHealth: () => HealthReport; };
export type ReferenceModelProcessingPriorityRank = 0 | 1 | 2;
export type ReferenceModelProcessingStateChange = (treeNodeIds: readonly string[], status: ProcessingStatus, stateByTreeNodeId: ProcessingStateByTreeNodeId) => void | Promise<void>;
