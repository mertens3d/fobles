// @source-path [fobles] src/content/toolbar/create-storage-synced-store.ts

import { useSyncExternalStore } from "react";

// Wraps a "fetch once, then subscribe to future changes" storage API (none of which expose an
// unsubscribe) into a React-friendly store whose underlying fetch/subscribe is registered exactly
// once per page load - no matter how many times the consuming component mounts or unmounts, or how
// many components consume it.
export type StorageSyncedStore<T> = { useValue: () => T; getValue: () => T };

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
