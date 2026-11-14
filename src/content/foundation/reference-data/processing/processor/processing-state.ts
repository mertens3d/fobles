// @source-path [fobles] src/content/foundation/reference-data/processing/processor/processing-state.ts

import type { ProcessingStateByTreeNodeId } from "../processing.types.ts";
import type { ProcessingStatus } from "../processing.types.ts";

export function setProcessingState(
  treeNodeIds: readonly string[],
  stateByTreeNodeId: ProcessingStateByTreeNodeId,
  status: ProcessingStatus,
): void {
  treeNodeIds.forEach((treeNodeId) => stateByTreeNodeId.set(treeNodeId, status));
}
