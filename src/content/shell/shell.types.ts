import type { StructuralAction } from "../../shared/structural/structural-command.types";
import type { KnownSite, StructuralScope, StructuralVisit } from "../../shared/structural/structural.types";

export type FoblesShellCommand = "auditor:open" | "reference-graph:open";

export type FoblesShellCommandEvent = { readonly command: FoblesShellCommand; readonly doc: Document };

export type StructuralCommandDependencies = {
  currentScope: () => StructuralScope;
  execute: (action: StructuralAction, scope: StructuralScope) => Promise<number>;
};

export type StructuralMaintenanceDependencies = {
  assertScope: (scope: StructuralScope) => void;
  invalidateCache: (scope: StructuralScope) => Promise<void>;
  invalidateScope: (scope: StructuralScope, invalidate: () => Promise<void>) => Promise<void>;
  invalidateSites: (scope: StructuralScope) => Promise<unknown>;
  readHistory: (scope: StructuralScope) => Promise<StructuralVisit[]>;
  readSites: (scope: StructuralScope) => Promise<KnownSite[]>;
  rediscover: (scope: StructuralScope, sites: readonly KnownSite[], visits: readonly StructuralVisit[]) => number;
};
