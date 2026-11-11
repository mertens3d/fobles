import { type AUDITOR_LAYOUT_VIEW_KEYS } from "./auditor-layout-view-settings";
import type { SitecoreHarvestFiltersState } from "../../../constants/_base/_REFERENCE_GRAPH_BASE";
import type { ReferenceModelNode } from "../../foundation/reference-data/model/reference-model.types";
import type { ItemGraphNodeData } from "../../foundation/reference-data/model/sitecore-item.types";
import type { ProcessingStateByTreeNodeId } from "../../foundation/reference-data/processing/processing.types";
import type { WorkOperation } from "../../foundation/workers/operation/work-operation.types";

// @source-path [fobles] src/content/features/auditor/auditor.types.ts

export type AuditSummaryCounts = { pending: number; passed: number; warning: number; error: number; total: number };

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

export type AuditCheck = {
  readonly key: string;
  readonly label: string;
  run(context: AuditCheckContext): Promise<void>;
};

export type BuildAuditFindingOptions = {
  checkKey: string;
  checkLabel: string;
  status: AuditFindingStatus;
  referenceModelNodeId: string | undefined;
  item: ItemGraphNodeData | undefined;
  summary: string;
  dataType?: string;
  // Injected rather than imported directly - buildFoblesUrl depends on browser globals
  // (window.location) that do not exist under Node's native-TS test runner. Production
  // (audit-runner.ts) passes the real buildFoblesUrl; tests pass a stub or omit it.
  buildSitecoreUrl?: (identity: string) => string;
  context?: string;
  details?: string;
  discoveredAt?: number;
  completedAt?: number;
};

export type AuditFindingStoreListener = (snapshot: readonly AuditFinding[]) => void;

export type AuditFindingStore = {
  upsert: (finding: AuditFinding) => void;
  upsertMany: (findings: readonly AuditFinding[]) => void;
  getSnapshot: () => readonly AuditFinding[];
  subscribe: (listener: AuditFindingStoreListener) => () => void;
  search: (query: string) => readonly AuditFinding[];
  filterByStatus: (statuses: ReadonlySet<AuditFindingStatus>) => readonly AuditFinding[];
  filterByCheck: (checkKeys: ReadonlySet<string>) => readonly AuditFinding[];
  getSummary: () => AuditSummaryCounts;
  clear: () => void;
  dispose: () => void;
};

export type AuditFindingStatus = "pending" | "passed" | "warning" | "error";

export type AuditFindingSeverity = "info" | "warning" | "error";

export type AuditFinding = {
  readonly id: string;
  readonly status: AuditFindingStatus;
  readonly severity: AuditFindingSeverity;
  readonly checkKey: string;
  readonly checkLabel: string;
  readonly referenceModelNodeId: string | undefined;
  readonly itemId: string | undefined;
  readonly itemName: string | undefined;
  readonly itemPath: string | undefined;
  readonly itemIcon: string | undefined;
  readonly dataType: string;
  readonly sitecoreUrl: string | undefined;
  readonly context: string | undefined;
  readonly summary: string;
  readonly details: string | undefined;
  readonly discoveredAt: number;
  readonly completedAt: number | undefined;
};

export type AuditOperationState = "created" | "running" | "closing" | "closed";

export type AuditDataOrigin = "Referenced" | "Cached" | "Live" | undefined;

export type AuditReportTreeNode = {
  id: string;
  parentId: string | undefined;
  depth: number;
  kind: "reference-model" | "finding";
  label: string;
  details: string | undefined;
  path: string | undefined;
  origin: AuditDataOrigin;
  status: AuditFindingStatus;
  hasChildren: boolean;
  referenceModelNodeId: string | undefined;
  icon: string | undefined;
  finding: AuditFinding | undefined;
};

export type AuditRunnerOptions = {
  doc: Document;
  findingStore: AuditFindingStore;
  workOperation: WorkOperation;
  filters: SitecoreHarvestFiltersState;
  onError?: (error: unknown) => void;
};

export type AuditRunner = { run: () => Promise<void>; dispose: () => void };

export type AuditorLayoutViewKey = (typeof AUDITOR_LAYOUT_VIEW_KEYS)[number];

export type AuditorLayoutViewSettings = Readonly<Record<AuditorLayoutViewKey, boolean>> & {
  readonly type: "auditorLayoutViewSettings";
};
