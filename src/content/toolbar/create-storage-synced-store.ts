// @source-path [fobles] src/content/toolbar/create-storage-synced-store.ts

import { useSyncExternalStore } from "react";
import type { StorageSyncedStore } from "./StorageSyncedStore";

export function createStorageSyncedStore<T>(
  fetchInitial: () => Promise<T>,
  onChange: (callback: (value: T) => void) => void,
  initialValue: T,
): StorageSyncedStore<T> {
  let value = initialValue;
  const listeners = new Set<() => void>();

  const notify = (next: T): void => {
    value = next;
    listeners.forEach((listener) => listener());
  };

  void fetchInitial().then(notify);
  onChange(notify);

  const useValue = (): T =>
    useSyncExternalStore(
      (listener) => {
        listeners.add(listener);
        return () => {
          listeners.delete(listener);
        };
      },
      () => value,
    );

  return { useValue, getValue: () => value };
}
