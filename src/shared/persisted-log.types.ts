export type PersistedLogLevel =
  | "debug"
  | "info"
  | "warn"
  | "error";

export type PersistedLogContext =
  | "content"
  | "background";

export type PersistedLogEntry = {
  id: string;
  timestamp: string;
  level: PersistedLogLevel;
  context: PersistedLogContext;
  args: unknown[];
};

export type PersistedLogMessage = {
  type: "FOBLES_PERSIST_LOG";
  entry: PersistedLogEntry;
};