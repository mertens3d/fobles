import type { WorkSession } from "../../foundation/workers/session/work-session.types";
import type { HarvestForLink } from "./reference-graph.types";
import type { PreparedReferenceGraph } from "./reference-graph.types";

export type ReferenceGraphAppProps = {
  doc: Document;
  workSession: WorkSession;
  initialPreparedGraph: PreparedReferenceGraph;
  harvestForLink: HarvestForLink;
};
