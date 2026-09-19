export type DebugSettings = {
  debugLogging: boolean;
  showReloadExtensionButton: boolean;
};

export type MessageRequest = {
  action?: string;
};

export type LogMethod = "debug" | "info" | "warn" | "error";

export type Logger = {
  debug: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
};
