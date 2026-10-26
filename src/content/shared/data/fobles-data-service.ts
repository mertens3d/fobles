// @source-path [fobles] src/content/shared/data/fobles-data-service.ts
import { getReferenceGraphFilters } from "../../../shared/reference-graph-settings";
import type { WorkSession } from "../../shell/work-session/work-session.types";
import type { SitecoreHarvestFiltersState } from "../../foundation/harvesting/sitecore-harvester.types";
import type { PreparedReferenceGraph } from "../../features/reference-graph/prepared-reference-graph.types";
import { startSharedReferenceModelSession, type ReferenceModelSessionStateChange, type SharedReferenceModelSession } from "../../foundation/reference-data/processing/reference-model-session";
import type { ReferenceModelHarvestProgress } from "../../foundation/reference-data/processing/reference-model-harvest-queue";
import type { ReferenceModelProcessingProgress } from "../../foundation/reference-data/processing/reference-model-processing.types";
export type FoblesDataFlavor = "reference-model";
export type FoblesDataRequest = { flavor: FoblesDataFlavor; target: "current-object"; doc: Document; workSession: WorkSession; signal: AbortSignal; filters?: SitecoreHarvestFiltersState; };
export type FoblesReferenceModelData = {
  itemId: string;
  model: PreparedReferenceGraph;
  resolveCandidateTreeNodeIds: ReadonlySet<string>;
  cacheRevalidationResultByTreeNodeId: ReadonlyMap<string, "passed" | "error">;
};
export type FoblesDataSession = {
  data: FoblesReferenceModelData;
  completion: Promise<void>;
  subscribeChange: (listener: ReferenceModelSessionStateChange) => () => void;
  subscribeProcessingProgress: (listener: (progress: ReferenceModelProcessingProgress) => void) => () => void;
  subscribeHarvestProgress: (listener: (progress: ReferenceModelHarvestProgress) => void) => () => void;
  dispose: () => void;
};
const dataSessionsByWorkSessionId = new Map<string, FoblesDataSession>();
export function getFoblesDataSession(workSessionId: string): FoblesDataSession | undefined { return dataSessionsByWorkSessionId.get(workSessionId); }
export async function openFoblesDataSession(request: FoblesDataRequest): Promise<FoblesDataSession | undefined> {
  dataSessionsByWorkSessionId.get(request.workSession.id)?.dispose();
  const filters = request.filters ?? await getReferenceGraphFilters();
  const source: SharedReferenceModelSession | undefined = await startSharedReferenceModelSession({ doc: request.doc, workSession: request.workSession, filters, signal: request.signal });
  if (!source || request.signal.aborted) return undefined;
  const session: FoblesDataSession = {
    data: { itemId: source.itemId, model: source.prepared, resolveCandidateTreeNodeIds: source.resolveCandidateTreeNodeIds, cacheRevalidationResultByTreeNodeId: source.cacheRevalidationResultByTreeNodeId },
    completion: source.processingCompletion,
    subscribeChange: source.subscribeStateChange,
    subscribeProcessingProgress: source.subscribeProcessingProgress,
    subscribeHarvestProgress: source.subscribeHarvestProgress,
    dispose: () => { source.dispose(); if (dataSessionsByWorkSessionId.get(request.workSession.id) === session) dataSessionsByWorkSessionId.delete(request.workSession.id); },
  };
  dataSessionsByWorkSessionId.set(request.workSession.id, session);
  return session;
}
