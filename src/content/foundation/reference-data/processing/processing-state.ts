import type { ProcessingStateByTreeNodeId } from "./processing.types.js";
import type { ProcessingStatus } from "./processing.types.js";

export function setProcessingState(
  treeNodeIds: readonly string[],
  stateByTreeNodeId: ProcessingStateByTreeNodeId,
  status: ProcessingStatus,
): void {
  treeNodeIds.forEach((treeNodeId) => stateByTreeNodeId.set(treeNodeId, status));
}
