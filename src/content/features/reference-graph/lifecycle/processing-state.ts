// @source-path [fobles] src/content/features/reference-graph/lifecycle/processing-state.ts
export type ProcessingStatus = "pending" | "enriching" | "enriched" | "verified" | "stale" | "unverified" | "not-found" | "failed";
export type ProcessingStateByTreeNodeId = Map<string, ProcessingStatus>;
export function setProcessingState(treeNodeIds: readonly string[], stateByTreeNodeId: ProcessingStateByTreeNodeId, status: ProcessingStatus): void {
  treeNodeIds.forEach((treeNodeId) => stateByTreeNodeId.set(treeNodeId, status));
}
