import type { SitecoreHarvestResult } from "../../../foundation/harvesting/harvesting.types";
import type { WorkSession } from "../../../foundation/workers/session/work-session.types";
import type { HarvestForLink, ReferenceGraphLoading } from "../reference-graph.types";

export type GraphToolbarHandle = {
  showGraph: (graph: SitecoreHarvestResult, addCurrentGraphToHistory: boolean) => void;
};

export type ReferenceGraphLoaderProps = {
  doc: Document;
  workSession: WorkSession;
  loading: ReferenceGraphLoading;
  harvestForLink: HarvestForLink;
};
