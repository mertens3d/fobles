// @source-path [fobles] src/content/features/reference-graph/reference-graph-modal.tsx

import type { WorkOperation } from "../../foundation/workers/operation/work-operation.types";
import { ReferenceGraphLoader } from "./components/reference-graph-loader";
import type { HarvestForLink } from "./reference-graph.types";
import type { ReferenceGraphLoading } from "./reference-graph.types";

export type ReferenceGraphViewProps = {
  doc: Document;
  workOperation: WorkOperation;
  loading: ReferenceGraphLoading;
  harvestForLink: HarvestForLink;
};

export function createReferenceGraphView({
  doc,
  workOperation,
  loading,
  harvestForLink,
}: ReferenceGraphViewProps) {
  return (
    <ReferenceGraphLoader
      doc={doc}
      workSession={workOperation}
      loading={loading}
      harvestForLink={harvestForLink}
    />
  );
}
