import type { RuntimeSettings } from "./runtime-settings.types.ts";

export const RUNTIME_SETTINGS_STORAGE_KEY = "fobles-runtime-settings";

export const RUNTIME_FAULT = { REFERENCE_GRAPH_RESTORE_EDITOR_STATE: "referenceGraph.restoreEditorState" } as const;

export const RUNTIME_SETTINGS_LIMITS = {
  MAX_BACKGROUND_INTERTASK_COOLDOWN_MS: 2_147_483_647,
  MAX_UNVALIDATED_AGE_HOURS: Math.floor(Number.MAX_SAFE_INTEGER / (60 * 60 * 1000)),
} as const;

export const DEFAULT_RUNTIME_SETTINGS: RuntimeSettings = {
  structuralCache: { maxUnvalidatedAgeHours: 7 * 24 },
  workerPool: {
    backgroundIntertaskCooldownMs: 1000,
    maxWorkers: 3,
    hideWorkerIframes: true,
    taskTimeoutMs: 20000,
    healthPollIntervalMs: 1000,
    workerNoProgressMs: 20000,
    workerMaxRecoveriesPerJob: 1,
    poolNoProgressMs: 30000,
    poolMaxWorkerRecoveries: 3,
    specialistNoProgressMs: 45000,
  },
  testing: {
    enabled: false,
    faults: { [RUNTIME_FAULT.REFERENCE_GRAPH_RESTORE_EDITOR_STATE]: false },
    showJourneyStepLive: true,
  },
};
