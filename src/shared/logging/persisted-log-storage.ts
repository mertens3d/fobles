import { STORAGE } from "../../constants/constants-b";
import type { PersistedLogMessage, PersistedLogEntry } from "../persisted-log.types";

const MAX_LOG_ENTRIES = 500;

let writeQueue: Promise<void> = Promise.resolve();

export function isPersistedLogMessage(
  value: unknown,
): value is PersistedLogMessage {
  return (
    typeof value === "object" &&
    value !== null &&
    "type" in value &&
    value.type === "FOBLES_PERSIST_LOG" &&
    "entry" in value
  );
}

export async function clearPersistedLogEntries(): Promise<void> {
  await chrome.storage.local.remove(
    STORAGE.KEY.PERSISTED_LOG_ENTRIES,
  );
}

export function appendPersistedLogEntry(
  entry: PersistedLogEntry,
): Promise<void> {
  writeQueue = writeQueue.then(async () => {
    const result = await chrome.storage.local.get(
      STORAGE.KEY.PERSISTED_LOG_ENTRIES,
    );

    const existingEntries = Array.isArray(
      result[STORAGE.KEY.PERSISTED_LOG_ENTRIES],
    )
      ? result[STORAGE.KEY.PERSISTED_LOG_ENTRIES] as PersistedLogEntry[]
      : [];

    const entries = [
      ...existingEntries,
      entry,
    ].slice(-MAX_LOG_ENTRIES);

    await chrome.storage.local.set({
      [STORAGE.KEY.PERSISTED_LOG_ENTRIES]: entries,
    });
  });

  return writeQueue;
}

export async function getPersistedLogEntries(): Promise<PersistedLogEntry[]> {
  const result = await chrome.storage.local.get(
    STORAGE.KEY.PERSISTED_LOG_ENTRIES,
  );

  const entries =
    result[STORAGE.KEY.PERSISTED_LOG_ENTRIES];

  return Array.isArray(entries)
    ? entries as PersistedLogEntry[]
    : [];
}