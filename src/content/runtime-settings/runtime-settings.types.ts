import type { RUNTIME_FAULT } from "./runtime-settings.const.ts";

export type RuntimeFault = (typeof RUNTIME_FAULT)[keyof typeof RUNTIME_FAULT];

export type RuntimeSettings = {
  structuralCache: { maxUnvalidatedAgeHours: number };
  workerPool: {
    backgroundIntertaskCooldownMs: number;
    maxWorkers: number;
    hideWorkerIframes: boolean;
    taskTimeoutMs: number;
    healthPollIntervalMs: number;
    workerNoProgressMs: number;
    workerMaxRecoveriesPerJob: number;
    poolNoProgressMs: number;
    poolMaxWorkerRecoveries: number;
    specialistNoProgressMs: number;
  };
  testing: { enabled: boolean; faults: Record<RuntimeFault, boolean>; showJourneyStepLive: boolean };
};
