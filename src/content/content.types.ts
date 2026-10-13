// @source-path [fobles] src/content/content.types.ts

export type MessageRequest = {
  action?: string;
};

export type Logger = {
  debug: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
};
