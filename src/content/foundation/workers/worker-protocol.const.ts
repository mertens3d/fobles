// @source-path [fobles] src/content/foundation/workers/worker-protocol.const.ts

// Wire-protocol strings for the worker pool's own cross-document/cross-tab messaging - owned by
// sitecore-worker since every consumer of these is pool/transport/iframe machinery, not anything
// harvest- or Reference-Graph-specific. Values are preserved exactly as they were under
// REFERENCE_GRAPH.BACKGROUND_HARVEST.MESSAGE.TYPE - they are wire strings, not display text, so
// they must not be renamed even though some still read "REFERENCE_GRAPH" historically.
export const WORKER_MESSAGE_TYPE = {
  POOL_CANCEL_REQUEST: "POOL_CANCEL_REQUEST",
  POOL_CANCEL_TASK: "POOL_CANCEL_TASK",
  POOL_DISPOSE: "FOBLES_REFERENCE_GRAPH_POOL_DISPOSE",
  POOL_RUN_TASK: "POOL_RUN_TASK",
  WORKER_ADOPTED: "FOBLES_REFERENCE_GRAPH_WORKER_ADOPTED",
  WORKER_READY: "WORKER_READY",
  WORKER_SET_OWNED: "FOBLES_REFERENCE_GRAPH_WORKER_SET_OWNED",
  WORKER_TASK_CANCEL: "WORKER_TASK_CANCEL",
  WORKER_TASK_EXECUTE: "WORKER_TASK_EXECUTE",
} as const;

export const DEBUG_WORKER_POOL = false;

// Development-only worker memory diagnostics. Keep false in packaged builds.
export const DEBUG_MEMORY = true;
