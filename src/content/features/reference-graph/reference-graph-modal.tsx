// @source-path [fobles] src/content/features/reference-graph/reference-graph-modal.tsx
import type { WorkOperation } from "../../foundation/workers/operation/work-operation.types";
import { ReferenceGraphOperationApp } from "../../shared/ui/reference-model/reference-graph-operation-app";
import type { HarvestForLink } from "./graph.types";
import type { PreparedReferenceGraph } from "./prepared-reference-graph.types";

export type ReferenceGraphViewProps = {
  doc: Document;
  workOperation: WorkOperation;
  preparedGraph: PreparedReferenceGraph;
  harvestForLink: HarvestForLink;
};

export function createReferenceGraphView({
  doc,
  workOperation,
  preparedGraph,
  harvestForLink,
}: ReferenceGraphViewProps) {
  return (
    <ReferenceGraphOperationApp
      doc={doc}
      workOperation={workOperation}
      initialPreparedGraph={preparedGraph}
      harvestForLink={harvestForLink}
    />
  );
}
