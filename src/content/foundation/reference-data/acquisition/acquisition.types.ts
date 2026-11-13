import type { HarvestProgressCallback } from "../../harvesting/harvesting.types";
import type { SitecoreHarvestResult } from "../../harvesting/harvesting.types";
import type { ReferenceModelNode } from "../model/model.types";
import type { ProcessingStateByTreeNodeId, ProcessingStatus } from "../processing/processing.types";

export type AcquireReferenceModelOptions = {
  signal: AbortSignal;
  onProgress?: HarvestProgressCallback;
  onHarvestRequired?: () => void;
};

export type AcquiredReferenceModel = { itemId: string; prepared: PreparedReferenceModel; decision: RootCacheDecision };

export type PreparedReferenceModel = {
  harvestedData: SitecoreHarvestResult;
  referenceModel: ReferenceModelNode;
  nodesById: Map<string, ReferenceModelNode>;
  processingStateByTreeNodeId: ProcessingStateByTreeNodeId;
};

export type PrepareReferenceModelOptions = {
  signal?: AbortSignal;
  // Seeds the root node's own trust badge from the root-cache-flow decision that produced this harvest result. Defaults
  // to "enriched" for callers whose result is always a just-completed harvest (reroot, lazy filter enable).
  rootProcessingState?: ProcessingStatus;
};

export type RootCacheDecision =
  | { kind: "cache-only"; result: SitecoreHarvestResult }
  | { kind: "cache-then-reharvest"; result: SitecoreHarvestResult }
  | { kind: "cache-unverified"; result: SitecoreHarvestResult }
  | { kind: "harvest-required" };
