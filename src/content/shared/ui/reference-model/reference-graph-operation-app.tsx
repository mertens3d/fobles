// @source-path [fobles] src/content/shared/ui/reference-model/reference-graph-operation-app.tsx
import type { WorkOperation } from "../../../foundation/workers/operation/work-operation.types";
import type { HarvestForLink } from "../../../features/reference-graph/graph.types";
import type { PreparedReferenceGraph } from "../../../features/reference-graph/prepared-reference-graph.types";
import { ReferenceGraphApp } from "../../../features/reference-graph/reference-graph-app";
export type ReferenceGraphOperationAppProps = { doc: Document; workOperation: WorkOperation; initialPreparedGraph: PreparedReferenceGraph; harvestForLink: HarvestForLink };
export function ReferenceGraphOperationApp({ doc, workOperation, initialPreparedGraph, harvestForLink }: ReferenceGraphOperationAppProps) {
  return <ReferenceGraphApp doc={doc} workSession={workOperation} initialPreparedGraph={initialPreparedGraph} harvestForLink={harvestForLink} />;
}
