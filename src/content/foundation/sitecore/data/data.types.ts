import type { SitecoreDataFactName } from "../../cache/sitecore-data/sitecore-data.types";
import type { SitecoreItemLocator, WorkerTaskExecutionResult } from "../../workers/tasks/worker-task.types";

export type SitecoreDataIdentity = { environment: string; database: string; language: string };

export type SitecoreFactSource = "cache" | "live";

export type ResolvedSitecoreFact<TValue> = {
  value: TValue;
  source: SitecoreFactSource;
  cachedAt?: number;
  lastVerifiedAt?: number;
};

export type FetchLiveFact = () => Promise<WorkerTaskExecutionResult>;

export type SitecoreDataFactResult<TValue> =
  | { outcome: "resolved"; fact: ResolvedSitecoreFact<TValue> }
  | { outcome: "unresolved"; result: WorkerTaskExecutionResult };

export type GetFactOptions = {
  activityId?: string;
  requestId?: string;
  // Discovery metadata only - carried through to a ValidationCandidate for a future Phase 3C
  // scheduler. Never used by Phase 3B's own read-through/write-through decisions.
  itemKind?: ValidationCandidateItemKind;
  visible?: boolean;
};

export type ValidationCandidateItemKind = "page" | "template" | "rendering" | "datasource" | "other";

export type ValidationCandidate = {
  item: SitecoreItemLocator;
  fact: SitecoreDataFactName;
  cacheState: "hit" | "miss";
  itemKind?: ValidationCandidateItemKind;
  cachedAt?: number;
  lastVerifiedAt?: number;
  visible?: boolean;
  discoveredAt: number;
};
