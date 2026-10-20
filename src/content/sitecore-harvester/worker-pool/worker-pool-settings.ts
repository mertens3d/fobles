// @source-path [fobles] src/content/sitecore-harvester/worker-pool/worker-pool-settings.ts

import { onStorageChange } from "../../../shared/storage/storage";
import {
  getRuntimeSettings,
  initializeRuntimeSettings,
  RUNTIME_SETTINGS_STORAGE_KEY,
} from "../../runtime-settings/runtime-settings";

export async function getWorkerPoolMaxWorkers(): Promise<number> {
  await initializeRuntimeSettings();
  return getRuntimeSettings().workerPool.maxWorkers;
}

export function onWorkerPoolMaxWorkersChange(callback: (maxWorkers: number) => void): void {
  onStorageChange(
    RUNTIME_SETTINGS_STORAGE_KEY,
    async () => {
      await initializeRuntimeSettings();
      callback(getRuntimeSettings().workerPool.maxWorkers);
    },
    "local",
  );
}