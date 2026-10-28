// @source-path [fobles] src/content/foundation/reference-data/processing/processing-state.ts
export type ProcessingStatus = "pending" | "cached" | "enriching" | "enriched" | "verified" | "stale" | "unverified" | "not-found" | "failed";
export type ProcessingStateByTreeNodeId = Map<string, ProcessingStatus>;
export function setProcessingState(treeNodeIds: readonly string[], stateByTreeNodeId: ProcessingStateByTreeNodeId, status: ProcessingStatus): void {
  treeNodeIds.forEach((treeNodeId) => stateByTreeNodeId.set(treeNodeId, status));
}
