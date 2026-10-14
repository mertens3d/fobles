// @source-path [fobles] src/content/sitecore-harvester/worker-pool/worker-pool-settings.ts

import { STORAGE } from "../../../constants/extension-constants";
import { REFERENCE_GRAPH } from "../../../constants/graph.const";
import { extensionLog } from "../../logger";
import {
  getStorageValue,
  onStorageChange,
  setStorageValue,
} from "../../../shared/storage/storage";

const DEFAULT_MAX_WORKERS =
  REFERENCE_GRAPH.WORKER_POOL.MAX_WORKERS;

const STORAGE_KEY =
  STORAGE.KEY.REFERENCE_GRAPH
    .WORKER_POOL_MAX_WORKERS;

export async function getWorkerPoolMaxWorkers():
  Promise<number> {
  const result =
    await getStorageValue<unknown>(
      [STORAGE_KEY],
      "local",
    );

  const storedValue =
    result[STORAGE_KEY];

  extensionLog.debug(
    "Worker pool: storage value",
    {
      key: STORAGE_KEY,
      storedValue,
      type: typeof storedValue,
      result,
    },
  );

  let maxWorkers =
    DEFAULT_MAX_WORKERS;

  if (
    typeof storedValue === "number" &&
    Number.isInteger(storedValue) &&
    storedValue > 0
  ) {
    maxWorkers = storedValue;
  }

  return maxWorkers;
}

export async function setWorkerPoolMaxWorkers(
  maxWorkers: number,
): Promise<void> {
  if (
    Number.isInteger(maxWorkers) &&
    maxWorkers > 0
  ) {
    await setStorageValue(
      {
        [STORAGE_KEY]: maxWorkers,
      },
      "local",
    );
  }
}

export function onWorkerPoolMaxWorkersChange(
  callback: (
    maxWorkers: number,
  ) => void,
): void {
  onStorageChange(
    STORAGE_KEY,
    (value) => {
      if (
        typeof value === "number" &&
        Number.isInteger(value) &&
        value > 0
      ) {
        callback(value);
      } else {
        callback(
          DEFAULT_MAX_WORKERS,
        );
      }
    },
    "local",
  );
}