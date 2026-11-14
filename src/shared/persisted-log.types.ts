// @source-path [fobles] src/shared/persisted-log.types.ts

import type { REFERENCE_GRAPH } from "../constants/graph.presets";

export type PersistedLogLevel = "debug" | "info" | "warn" | "error";

export type PersistedLogContext = "content" | "background";

export type PersistedLogEntry = {
  id: string;
  timestamp: string;
  level: PersistedLogLevel;
  context: PersistedLogContext;
  args: unknown[];
};

export type PersistedLogMessage = { type: typeof REFERENCE_GRAPH.FOBLES_PERSIST_LOG; entry: PersistedLogEntry };
