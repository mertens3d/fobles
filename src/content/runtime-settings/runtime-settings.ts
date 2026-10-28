// @source-path [fobles] src/content/runtime-settings/runtime-settings.ts
import { getStorageValue, onStorageChange, setStorageValue } from "../../shared/storage/storage";
export const RUNTIME_SETTINGS_STORAGE_KEY = "fobles-runtime-settings";
export const RUNTIME_FAULT = { REFERENCE_GRAPH_RESTORE_EDITOR_STATE: "referenceGraph.restoreEditorState" } as const;
export type RuntimeFault = (typeof RUNTIME_FAULT)[keyof typeof RUNTIME_FAULT];
export type RuntimeSettings = { workerPool: { maxWorkers: number; hideWorkerIframes: boolean; taskTimeoutMs: number; healthPollIntervalMs: number; workerNoProgressMs: number; workerMaxRecoveriesPerJob: number; poolNoProgressMs: number; poolMaxWorkerRecoveries: number; specialistNoProgressMs: number; }; testing: { enabled: boolean; faults: Record<RuntimeFault, boolean>; showJourneyStepLive: boolean; }; };
export const DEFAULT_RUNTIME_SETTINGS: RuntimeSettings = { workerPool: { maxWorkers: 3, hideWorkerIframes: true, taskTimeoutMs: 20000, healthPollIntervalMs: 1000, workerNoProgressMs: 20000, workerMaxRecoveriesPerJob: 1, poolNoProgressMs: 30000, poolMaxWorkerRecoveries: 3, specialistNoProgressMs: 45000 }, testing: { enabled: false, faults: { [RUNTIME_FAULT.REFERENCE_GRAPH_RESTORE_EDITOR_STATE]: false }, showJourneyStepLive: true } };
function positiveInteger(value: unknown, fallback: number): number { return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : fallback; }
function nonNegativeInteger(value: unknown, fallback: number): number { return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : fallback; }
let runtimeSettings: RuntimeSettings = structuredClone(DEFAULT_RUNTIME_SETTINGS);
let initialized = false;
export function normalizeRuntimeSettings(value: unknown): RuntimeSettings {
  const stored = value && typeof value === "object" ? value as Partial<RuntimeSettings> : undefined;
  const workerPool = stored?.workerPool;
  const testing = stored?.testing;
  return { workerPool: {
    maxWorkers: typeof workerPool?.maxWorkers === "number" && Number.isInteger(workerPool.maxWorkers) && workerPool.maxWorkers > 0 ? workerPool.maxWorkers : DEFAULT_RUNTIME_SETTINGS.workerPool.maxWorkers,
    hideWorkerIframes: typeof workerPool?.hideWorkerIframes === "boolean" ? workerPool.hideWorkerIframes : DEFAULT_RUNTIME_SETTINGS.workerPool.hideWorkerIframes,
    taskTimeoutMs: positiveInteger(workerPool?.taskTimeoutMs, DEFAULT_RUNTIME_SETTINGS.workerPool.taskTimeoutMs),
    healthPollIntervalMs: positiveInteger(workerPool?.healthPollIntervalMs, DEFAULT_RUNTIME_SETTINGS.workerPool.healthPollIntervalMs),
    workerNoProgressMs: positiveInteger(workerPool?.workerNoProgressMs, DEFAULT_RUNTIME_SETTINGS.workerPool.workerNoProgressMs),
    workerMaxRecoveriesPerJob: nonNegativeInteger(workerPool?.workerMaxRecoveriesPerJob, DEFAULT_RUNTIME_SETTINGS.workerPool.workerMaxRecoveriesPerJob),
    poolNoProgressMs: positiveInteger(workerPool?.poolNoProgressMs, DEFAULT_RUNTIME_SETTINGS.workerPool.poolNoProgressMs),
    poolMaxWorkerRecoveries: nonNegativeInteger(workerPool?.poolMaxWorkerRecoveries, DEFAULT_RUNTIME_SETTINGS.workerPool.poolMaxWorkerRecoveries),
    specialistNoProgressMs: positiveInteger(workerPool?.specialistNoProgressMs, DEFAULT_RUNTIME_SETTINGS.workerPool.specialistNoProgressMs),
  }, testing: { enabled: testing?.enabled === true, faults: Object.fromEntries(Object.values(RUNTIME_FAULT).map((fault) => [fault, testing?.faults?.[fault] === true])) as Record<RuntimeFault, boolean>, showJourneyStepLive: testing?.showJourneyStepLive !== false } };
}
export async function initializeRuntimeSettings(): Promise<RuntimeSettings> { if (!initialized) { const stored = await getStorageValue<unknown>([RUNTIME_SETTINGS_STORAGE_KEY], "local"); const persisted = stored[RUNTIME_SETTINGS_STORAGE_KEY]; runtimeSettings = normalizeRuntimeSettings(persisted); initialized = true; if (persisted === undefined) await setStorageValue({ [RUNTIME_SETTINGS_STORAGE_KEY]: runtimeSettings }, "local"); onStorageChange(RUNTIME_SETTINGS_STORAGE_KEY, (value) => { runtimeSettings = normalizeRuntimeSettings(value); }, "local"); } return runtimeSettings; }
export function getRuntimeSettings(): RuntimeSettings { return runtimeSettings; }
export function isRuntimeFaultEnabled(fault: RuntimeFault): boolean { return runtimeSettings.testing.enabled && runtimeSettings.testing.faults[fault]; }
// False skips the live verification step of the reference journey: references are shown from cache only and never verified live.
export function isJourneyStepLiveEnabled(): boolean { return runtimeSettings.testing.showJourneyStepLive; }
