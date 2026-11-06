import { readKnownSites, mutateKnownSites } from "../../../../../shared/known-sites/known-sites-repository.ts";
import { getStructuralSettings } from "../../../../../shared/structural/structural-settings.ts";
import type { StructuralScope, StructuralVisit } from "../../../../../shared/structural/structural.types.ts";
import { extensionLog } from "../../../../logger.ts";
import { createStructuralDiscoveryService } from "./structural-discovery-service.ts";
import { createStructuralRuntimeDriver } from "./structural-runtime-driver.ts";
import type { StructuralRuntimeOptions } from "./structural-service.types.ts";

let createSession: StructuralRuntimeOptions["createSession"] | undefined;
let reportError: ((error: unknown) => void) | undefined;

export function configureStructuralWorkSession(
  factory: StructuralRuntimeOptions["createSession"],
  onError?: (error: unknown) => void,
): void {
  createSession = factory;
  reportError = onError;
}

const service = createStructuralDiscoveryService({
  createDriver: (scope) => {
    if (!createSession) {
      throw new Error("Shell must configure structural WorkSession composition before discovery");
    }
    return createStructuralRuntimeDriver(scope, { createSession });
  },
  settings: getStructuralSettings,
  readSites: readKnownSites,
  upsertSite: (scope, site) => mutateKnownSites(scope, { action: "upsert", site }),
  removeSite: (scope, id) => mutateKnownSites(scope, { action: "remove", id }),
  now: Date.now,
  onError: (error) => {
    extensionLog.warn("Structural discovery failed", { error });
    reportError?.(error);
  },
});

export function scheduleStructuralDiscovery(scope: StructuralScope, visits: readonly StructuralVisit[]): void {
  service.scheduleStructuralDiscovery(scope, visits);
}

export const lookupKnownSite = service.lookupKnownSite;

export const invalidateStructuralSettings = service.invalidateSettings;

export const invalidateStructuralScope = service.invalidateScope;

export const rediscoverStructuralScope = service.rediscoverScope;