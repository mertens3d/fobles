// @source-path [fobles] src/content/runtime-settings/runtime-settings.ts
import { getStorageValue, onStorageChange, setStorageValue } from "../../shared/storage/storage.ts";
import { DEFAULT_RUNTIME_SETTINGS, RUNTIME_FAULT, RUNTIME_SETTINGS_LIMITS, RUNTIME_SETTINGS_STORAGE_KEY } from "./runtime-settings.const.ts";
import type { RuntimeFault, RuntimeSettings } from "./runtime-settings.types.ts";
function boundedInteger(value: unknown, fallback: number, minimum: number, maximum: number): number { return typeof value === "number" && Number.isSafeInteger(value) && value >= minimum && value <= maximum ? value : fallback; }
function positiveInteger(value: unknown, fallback: number): number { return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : fallback; }
function nonNegativeInteger(value: unknown, fallback: number): number { return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : fallback; }
let runtimeSettings: RuntimeSettings = structuredClone(DEFAULT_RUNTIME_SETTINGS);
let initialized = false;

export function normalizeRuntimeSettings(value: unknown): RuntimeSettings {
  const stored = value && typeof value === "object" ? (value as Partial<RuntimeSettings>) : undefined;
  const workerPool = stored?.workerPool;
  const testing = stored?.testing;
  return {
    structuralCache: { maxUnvalidatedAgeHours: boundedInteger(stored?.structuralCache?.maxUnvalidatedAgeHours, DEFAULT_RUNTIME_SETTINGS.structuralCache.maxUnvalidatedAgeHours, 1, RUNTIME_SETTINGS_LIMITS.MAX_UNVALIDATED_AGE_HOURS) },
    workerPool: {
      backgroundIntertaskCooldownMs: boundedInteger(workerPool?.backgroundIntertaskCooldownMs, DEFAULT_RUNTIME_SETTINGS.workerPool.backgroundIntertaskCooldownMs, 0, RUNTIME_SETTINGS_LIMITS.MAX_BACKGROUND_INTERTASK_COOLDOWN_MS),
      maxWorkers: typeof workerPool?.maxWorkers === "number" && Number.isInteger(workerPool.maxWorkers) && workerPool.maxWorkers > 0 ? workerPool.maxWorkers : DEFAULT_RUNTIME_SETTINGS.workerPool.maxWorkers,
      hideWorkerIframes: typeof workerPool?.hideWorkerIframes === "boolean" ? workerPool.hideWorkerIframes : DEFAULT_RUNTIME_SETTINGS.workerPool.hideWorkerIframes,
      taskTimeoutMs: positiveInteger(workerPool?.taskTimeoutMs, DEFAULT_RUNTIME_SETTINGS.workerPool.taskTimeoutMs),
      healthPollIntervalMs: positiveInteger(workerPool?.healthPollIntervalMs, DEFAULT_RUNTIME_SETTINGS.workerPool.healthPollIntervalMs),
      workerNoProgressMs: positiveInteger(workerPool?.workerNoProgressMs, DEFAULT_RUNTIME_SETTINGS.workerPool.workerNoProgressMs),
      workerMaxRecoveriesPerJob: nonNegativeInteger(workerPool?.workerMaxRecoveriesPerJob, DEFAULT_RUNTIME_SETTINGS.workerPool.workerMaxRecoveriesPerJob),
      poolNoProgressMs: positiveInteger(workerPool?.poolNoProgressMs, DEFAULT_RUNTIME_SETTINGS.workerPool.poolNoProgressMs),
      poolMaxWorkerRecoveries: nonNegativeInteger(workerPool?.poolMaxWorkerRecoveries, DEFAULT_RUNTIME_SETTINGS.workerPool.poolMaxWorkerRecoveries),
      specialistNoProgressMs: positiveInteger(workerPool?.specialistNoProgressMs, DEFAULT_RUNTIME_SETTINGS.workerPool.specialistNoProgressMs),
    },
    testing: { enabled: testing?.enabled === true, faults: Object.fromEntries(Object.values(RUNTIME_FAULT).map((fault) => [fault, testing?.faults?.[fault] === true])) as Record<RuntimeFault, boolean>, showJourneyStepLive: testing?.showJourneyStepLive !== false },
  };
}

export async function initializeRuntimeSettings(): Promise<RuntimeSettings> {
  if (!initialized && typeof chrome !== "undefined") {
    const stored = await getStorageValue<unknown>([RUNTIME_SETTINGS_STORAGE_KEY], "local");
    const persisted = stored[RUNTIME_SETTINGS_STORAGE_KEY];
    runtimeSettings = normalizeRuntimeSettings(persisted);
    initialized = true;
    if (persisted === undefined) { await setStorageValue({ [RUNTIME_SETTINGS_STORAGE_KEY]: runtimeSettings }, "local"); }
    onStorageChange(RUNTIME_SETTINGS_STORAGE_KEY, (value) => { runtimeSettings = normalizeRuntimeSettings(value); }, "local");
  }
  return runtimeSettings;
}

export function getRuntimeSettings(): RuntimeSettings { return runtimeSettings; }
export function getStructuralCacheMaxUnvalidatedAgeMs(): number { return runtimeSettings.structuralCache.maxUnvalidatedAgeHours * 60 * 60 * 1000; }
export function isRuntimeFaultEnabled(fault: RuntimeFault): boolean { return runtimeSettings.testing.enabled && runtimeSettings.testing.faults[fault]; }
export function isJourneyStepLiveEnabled(): boolean { return runtimeSettings.testing.showJourneyStepLive; }
