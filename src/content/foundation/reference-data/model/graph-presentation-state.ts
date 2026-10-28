// @source-path [fobles] src/content/foundation/reference-data/model/graph-presentation-state.ts
import type { ReferenceModelBranch, ReferenceModelNode, RelationshipToParent } from "./reference-model.types";
import type { GraphCollapseKey } from "./graph-collapse.types";
import type { NodeKind } from "../../../../constants/_base/_REFERENCE_GRAPH_BASE";
export type GraphPresentationState = { kind: NodeKind; collapseKey: GraphCollapseKey; branch?: ReferenceModelBranch; relationshipToParent?: RelationshipToParent; reverse?: boolean };
const stateByNode = new WeakMap<ReferenceModelNode, GraphPresentationState>();
export function setGraphPresentationState(node: ReferenceModelNode, state: GraphPresentationState): void { 
stateByNode.set(node, state); }
export function getGraphPresentationState(node: ReferenceModelNode): GraphPresentationState { 
const state = stateByNode.get(node); 
if (!state) 
throw new Error(`Missing graph presentation state for ${node.treeNodeId}`); 
return state; }
