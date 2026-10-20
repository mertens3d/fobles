// @source-path [fobles] src/content/runtime-settings/runtime-settings.ts

import { getStorageValue, onStorageChange, setStorageValue } from "../../shared/storage/storage";

export const RUNTIME_SETTINGS_STORAGE_KEY = "fobles-runtime-settings";

export const RUNTIME_FAULT = {
  REFERENCE_GRAPH_RESTORE_EDITOR_STATE: "referenceGraph.restoreEditorState",
} as const;

export type RuntimeFault = (typeof RUNTIME_FAULT)[keyof typeof RUNTIME_FAULT];

export type RuntimeSettings = {
  workerPool: {
    maxWorkers: number;
    hideWorkerIframes: boolean;
  };
  testing: {
    enabled: boolean;
    faults: Record<RuntimeFault, boolean>;
  };
};

export const DEFAULT_RUNTIME_SETTINGS: RuntimeSettings = {
  workerPool: {
    maxWorkers: 3,
    hideWorkerIframes: true,
  },
  testing: {
    enabled: false,
    faults: {
      [RUNTIME_FAULT.REFERENCE_GRAPH_RESTORE_EDITOR_STATE]: false,
    },
  },
};

let runtimeSettings: RuntimeSettings = structuredClone(DEFAULT_RUNTIME_SETTINGS);
let initialized = false;

function normalizeRuntimeSettings(value: unknown): RuntimeSettings {
  const stored = value && typeof value === "object" ? value as Partial<RuntimeSettings> : undefined;
  const workerPool = stored?.workerPool;
  const testing = stored?.testing;

  return {
    workerPool: {
      maxWorkers:
        typeof workerPool?.maxWorkers === "number" &&
          Number.isInteger(workerPool.maxWorkers) &&
          workerPool.maxWorkers > 0
          ? workerPool.maxWorkers
          : DEFAULT_RUNTIME_SETTINGS.workerPool.maxWorkers,
      hideWorkerIframes:
        typeof workerPool?.hideWorkerIframes === "boolean"
          ? workerPool.hideWorkerIframes
          : DEFAULT_RUNTIME_SETTINGS.workerPool.hideWorkerIframes,
    },
    testing: {
      enabled: testing?.enabled === true,
      faults: Object.fromEntries(
        Object.values(RUNTIME_FAULT).map((fault) => [fault, testing?.faults?.[fault] === true]),
      ) as Record<RuntimeFault, boolean>,
    },
  };
}

export async function initializeRuntimeSettings(): Promise<RuntimeSettings> {
  if (!initialized) {
    const stored = await getStorageValue<unknown>([RUNTIME_SETTINGS_STORAGE_KEY], "local");
    const persisted = stored[RUNTIME_SETTINGS_STORAGE_KEY];

    runtimeSettings = normalizeRuntimeSettings(persisted);
    initialized = true;

    if (persisted === undefined) {
      await setStorageValue(
        {
          [RUNTIME_SETTINGS_STORAGE_KEY]: runtimeSettings,
        },
        "local",
      );
    }

    onStorageChange(
      RUNTIME_SETTINGS_STORAGE_KEY,
      (value) => {
        runtimeSettings = normalizeRuntimeSettings(value);
      },
      "local",
    );
  }

  return runtimeSettings;
}

export function getRuntimeSettings(): RuntimeSettings {
  return runtimeSettings;
}

export function isRuntimeFaultEnabled(fault: RuntimeFault): boolean {
  return runtimeSettings.testing.enabled && runtimeSettings.testing.faults[fault];
}