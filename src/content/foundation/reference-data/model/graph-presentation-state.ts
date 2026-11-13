// @source-path [fobles] src/content/foundation/reference-data/model/graph-presentation-state.ts

import type { GraphPresentationState } from "./model.types";
import type { ReferenceModelNode } from "./model.types";

const stateByNode = new WeakMap<ReferenceModelNode, GraphPresentationState>();

export function setGraphPresentationState(node: ReferenceModelNode, state: GraphPresentationState): void {
  stateByNode.set(node, state);
}

export function getGraphPresentationState(node: ReferenceModelNode): GraphPresentationState {
  const state = stateByNode.get(node);
  if (!state) {
    throw new Error(`Missing graph presentation state for ${node.treeNodeId}`);
  }
  return state;
}
