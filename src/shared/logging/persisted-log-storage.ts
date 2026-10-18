// @source-path [fobles] src/shared/logging/persisted-log-storage.ts

import { STORAGE } from "../../constants/extension-const";
import { REFERENCE_GRAPH } from "../../constants/graph.const";
import type {
  PersistedLogEntry,
  PersistedLogMessage,
} from "../persisted-log.types";
import {
  getStorageValue,
  removeStorageValue,
  setStorageValue,
} from "../storage/storage";

const MAX_LOG_ENTRIES = 500;

let writeQueue: Promise<void> =
  Promise.resolve();

export function isPersistedLogMessage(
  value: unknown,
): value is PersistedLogMessage {
  return (
    typeof value === "object" &&
    value !== null &&
    "type" in value &&
    value.type ===
      REFERENCE_GRAPH
        .BACKGROUND_HARVEST
        .MESSAGE
        .TYPE
        .FOBLES_PERSIST_LOG &&
    "entry" in value
  );
}

export async function clearPersistedLogEntries():
  Promise<void> {
  await removeStorageValue(
    STORAGE.KEY.PERSISTED_LOG_ENTRIES,
    "local",
  );
}

export function appendPersistedLogEntry(
  entry: PersistedLogEntry,
): Promise<void> {
  writeQueue = writeQueue.then(
    async (): Promise<void> => {
      const result =
        await getStorageValue<unknown>(
          [
            STORAGE.KEY
              .PERSISTED_LOG_ENTRIES,
          ],
          "local",
        );

      const candidate =
        result[
          STORAGE.KEY
            .PERSISTED_LOG_ENTRIES
        ];

      const existingEntries:
        PersistedLogEntry[] =
          Array.isArray(candidate)
            ? candidate as PersistedLogEntry[]
            : [];

      const entries = [
        ...existingEntries,
        entry,
      ].slice(-MAX_LOG_ENTRIES);

      await setStorageValue(
        {
          [STORAGE.KEY
            .PERSISTED_LOG_ENTRIES]:
            entries,
        },
        "local",
      );
    },
  );

  return writeQueue;
}

export async function getPersistedLogEntries():
  Promise<PersistedLogEntry[]> {
  const result =
    await getStorageValue<unknown>(
      [
        STORAGE.KEY
          .PERSISTED_LOG_ENTRIES,
      ],
      "local",
    );

  const candidate =
    result[
      STORAGE.KEY
        .PERSISTED_LOG_ENTRIES
    ];

  return Array.isArray(candidate)
    ? candidate as PersistedLogEntry[]
    : [];
}