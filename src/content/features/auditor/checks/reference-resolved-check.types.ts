import type { ProcessingStatus } from "../../../foundation/reference-data/processing/processing-state";
import type { AuditFindingStatus } from "../audit-finding.types";

export type ResolveStateInterpretation = {
  status: AuditFindingStatus;
  summary: string;
};

export type ReferenceResolvedDiagnostic = {
  treeNodeId: string;
  processingStatus: ProcessingStatus | undefined;
  findingStatus: AuditFindingStatus;
  itemId: string | undefined;
  itemPath: string | undefined;
};
