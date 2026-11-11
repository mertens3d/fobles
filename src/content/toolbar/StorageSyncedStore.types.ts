// Wraps a "fetch once, then subscribe to future changes" storage API (none of which expose an
// unsubscribe) into a React-friendly store whose underlying fetch/subscribe is registered exactly
// once per page load - no matter how many times the consuming component mounts or unmounts, or how
// many components consume it.

export type StorageSyncedStore<T> = { useValue: () => T; getValue: () => T; };
