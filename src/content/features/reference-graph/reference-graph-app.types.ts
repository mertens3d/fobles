import type { WorkSession } from "../../foundation/workers/session/work-session.types";
import type { HarvestForLink } from "./graph.types";
import type { PreparedReferenceGraph } from "./prepared-reference-graph.types";

export type ReferenceGraphAppProps = {
  doc: Document;
  workSession: WorkSession;
  initialPreparedGraph: PreparedReferenceGraph;
  harvestForLink: HarvestForLink;
};
