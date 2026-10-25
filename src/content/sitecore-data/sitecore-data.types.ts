// @source-path [fobles] src/content/sitecore-data/sitecore-data.types.ts

import type {
  SitecoreDataFactMap,
  SitecoreDataFactName,
} from "../sitecore-data-cache/sitecore-data-cache.types";
import type { SitecoreItemLocator, WorkerTaskExecutionResult } from "../foundation/workers/tasks/worker-task.types";

export type SitecoreFactSource = "cache" | "live";

// The one envelope every resolved fact comes back in, regardless of which path produced it -
// cachedAt/lastVerifiedAt are metadata only (Phase 3B never uses them to decide trust/staleness).
export type ResolvedSitecoreFact<TValue> = {
  value: TValue;
  source: SitecoreFactSource;
  cachedAt?: number;
  lastVerifiedAt?: number;
};

// A caller-supplied function that performs the real, atomic Sitecore worker read/write - the
// service never constructs a WorkerTask itself, it only decides whether this needs to run.
export type FetchLiveFact = () => Promise<WorkerTaskExecutionResult>;

// getFact's outcome: either a usable fact (from cache or freshly fetched live), or the raw
// worker result when the live fetch didn't produce cacheable data (error/cancelled/document-stale)
// - callers keep their existing WorkerTaskExecutionResult-based error handling for that case.
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

// Not constructed or queued anywhere yet - Phase 3C's validation scheduler will build these from
// the metadata GetFactOptions/getFact already have in hand, without requiring every field.
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

export type { SitecoreDataFactMap, SitecoreDataFactName };
