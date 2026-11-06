// @source-path [fobles] src/content/foundation/workers/pool/worker-pool-settings.ts

import { onStorageChange } from "../../../../shared/storage/storage";
import {
  getRuntimeSettings,
  initializeRuntimeSettings,
} from "../../../runtime-settings/runtime-settings";
import { RUNTIME_SETTINGS_STORAGE_KEY } from "../../../runtime-settings/runtime-settings.const";

export async function getWorkerPoolMaxWorkers(): Promise<number> {
  await initializeRuntimeSettings();
  return getRuntimeSettings().workerPool.maxWorkers;
}

export function onWorkerPoolMaxWorkersChange(callback: (maxWorkers: number) => void): void {
  onStorageChange(
    RUNTIME_SETTINGS_STORAGE_KEY,
    () => {
      void initializeRuntimeSettings().then(() => callback(getRuntimeSettings().workerPool.maxWorkers));
    },
    "local",
  );
}
