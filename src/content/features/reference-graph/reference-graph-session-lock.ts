// @source-path [fobles] src/content/features/reference-graph/reference-graph-session-lock.ts

export const REFERENCE_GRAPH_LOCK_ACQUIRE = "FOBLES_REFERENCE_GRAPH_LOCK_ACQUIRE" as const;
export const REFERENCE_GRAPH_LOCK_RELEASE = "FOBLES_REFERENCE_GRAPH_LOCK_RELEASE" as const;
export type ReferenceGraphLockResult = { acquired: boolean };

export async function acquireReferenceGraphSessionLock(): Promise<boolean> {
  const result: unknown = await chrome.runtime.sendMessage({ type: REFERENCE_GRAPH_LOCK_ACQUIRE });
  if (!result || typeof result !== "object" || !("acquired" in result) || typeof result.acquired !== "boolean") return false;
  return (result as ReferenceGraphLockResult).acquired;
}

export async function releaseReferenceGraphSessionLock(): Promise<void> {
  await chrome.runtime.sendMessage({ type: REFERENCE_GRAPH_LOCK_RELEASE });
}
