// @source-path [fobles] src/content/features/reference-graph/graph-nodes/graph-presentation-state.ts
import type { DataTreeBranch, DataTreeNode, RelationshipToParent } from "../data-tree/data-tree.types";
import type { GraphCollapseKey } from "./graph-collapse.types";
export type GraphPresentationState = { collapseKey: GraphCollapseKey; branch?: DataTreeBranch; relationshipToParent?: RelationshipToParent; reverse?: boolean };
const stateByNode = new WeakMap<DataTreeNode, GraphPresentationState>();
export function setGraphPresentationState(node: DataTreeNode, state: GraphPresentationState): void { stateByNode.set(node, state); }
export function getGraphPresentationState(node: DataTreeNode): GraphPresentationState { const state = stateByNode.get(node); if (!state) throw new Error(`Missing graph presentation state for ${node.treeNodeId}`); return state; }
