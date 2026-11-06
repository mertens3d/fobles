import type { ItemKind, KnownSite, StructuralScope, StructuralSettings, StructuralVisit } from "../../../../../shared/structural/structural.types.ts";
import type { SitecoreItemLocator, WorkerTaskResult } from "../../../workers/tasks/worker-task.types.ts";
import type { WorkSession } from "../../../workers/session/work-session.types.ts";
import type { WorkClass } from "../../../workers/work-scheduling.types.ts";
import type { SitecoreDataIdentity } from "../../../sitecore/data/sitecore-data-identity.ts";
import type { TemplateDerivedRecord } from "../../../cache/sitecore-data/template-derived.types.ts";

export type StructuralItem = StructuralVisit & { templateId?: string };

export type StructuralRead<T> = { value: T; cachedAt: number };

export type StructuralDriver = {
  quickInfo: (item: SitecoreItemLocator, fresh: boolean) => Promise<StructuralRead<StructuralItem | null> | undefined>;
  parent: (id: string, fresh?: boolean) => Promise<StructuralRead<string | undefined> | undefined>;
  bases: (id: string, fresh: boolean) => Promise<StructuralRead<readonly string[]> | undefined>;
  readDerived: (id: string) => Promise<StructuralRead<TemplateDerivedRecord> | undefined>;
  writeDerived: (id: string, value: TemplateDerivedRecord) => Promise<void>;
  finish: () => Promise<void>;
};

export type StructuralServiceDependencies = {
  createDriver: (scope: StructuralScope) => Promise<StructuralDriver>;
  settings: () => Promise<StructuralSettings>;
  readSites: (scope: StructuralScope) => Promise<KnownSite[]>;
  upsertSite: (scope: StructuralScope, site: KnownSite) => Promise<unknown>;
  removeSite: (scope: StructuralScope, id: string) => Promise<unknown>;
  now: () => number;
  onError: (error: unknown) => void;
};

export type StructuralClassification = { kind: ItemKind; complete: boolean; stale: boolean };

export type StructuralDiscoveryService = {
  invalidateScope: (scope: StructuralScope, invalidate: () => Promise<void>) => Promise<void>;
  invalidateSettings: () => void;
  rediscoverScope: (scope: StructuralScope, sites: readonly KnownSite[], visits: readonly StructuralVisit[]) => number;
  scheduleStructuralDiscovery: (scope: StructuralScope, visits: readonly StructuralVisit[]) => void;
  lookupKnownSite: (scope: StructuralScope, path: string) => Promise<KnownSite | undefined>;
  whenIdle: () => Promise<void>;
};

export type StructuralRuntimeOptions = {
  createSession: (workClass: WorkClass) => WorkSession;
  identity?: SitecoreDataIdentity;
  origin?: string;
  templateBasesFallback?: (session: WorkSession, item: SitecoreItemLocator, url: string) => Promise<WorkerTaskResult | undefined>;
  now?: () => number;
};