import type { ProcessingStatus } from "../../../foundation/reference-data/processing/processing.types";
import type { AuditFindingStatus } from "../auditor.types";

export type ResolveStateInterpretation = { status: AuditFindingStatus; summary: string };

export type ReferenceResolvedDiagnostic = {
  treeNodeId: string;
  processingStatus: ProcessingStatus | undefined;
  findingStatus: AuditFindingStatus;
  itemId: string | undefined;
  itemPath: string | undefined;
};
