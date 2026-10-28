// @source-path [fobles] src/content/features/auditor/audit-check.types.ts

import type { ReferenceModelNode } from "../../foundation/reference-data/model/reference-model.types";
import type { ProcessingStateByTreeNodeId } from "../../foundation/reference-data/processing/processing-state";
import type { AuditFindingStore } from "./audit-finding-store";

export type AuditCheckContext = {
  readonly signal: AbortSignal;
  readonly referenceModelRoot: ReferenceModelNode;
  readonly referenceModelNodesById: ReadonlyMap<string, ReferenceModelNode>;
  readonly findingStore: AuditFindingStore;
  readonly processingStateByTreeNodeId: ProcessingStateByTreeNodeId;
  readonly resolveCandidateTreeNodeIds: ReadonlySet<string>;
  readonly cacheRevalidationResultByTreeNodeId: ReadonlyMap<string, "passed" | "error">;
  readonly buildSitecoreUrl: (item: string) => string;
};

// Invoked repeatedly as the audit progresses (root facts are known immediately; referenced-item
// facts arrive over time) - a run() call re-scans currently known state and upserts findings for
// whatever it can already determine, relying on AuditFindingStore's id-keyed upsert for dedup.
export type AuditCheck = {
    readonly key: string;
    readonly label: string;
    run(context: AuditCheckContext): Promise<void>;
};
