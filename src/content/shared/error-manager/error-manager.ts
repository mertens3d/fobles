// @source-path [fobles] src/content/shared/error-manager/error-manager.ts

import type { FoblesErrorRecord } from "./error-manager.types.js";
import { extensionLog } from "../../logger";

const listeners = new Set<() => void>();
let currentError: FoblesErrorRecord | undefined;

function stringifyObject(value: object): string {
  let description: string;
  try {
    description = JSON.stringify(value);
  } catch {
    description = Object.prototype.toString.call(value);
  }
  return description;
}

function describePrimitive(value: string | number | boolean | bigint): string {
  return typeof value === "string" ? value : value.toString();
}

// Agent: Non-Error values can be any shape; objects are JSON-serialized so they never render as "[object Object]".
function describeUnknownError(error: unknown): string | undefined {
  let description: string | undefined;
  if (error === undefined) {
    description = undefined;
  } else if (error === null) {
    description = "null";
  } else if (typeof error === "object") {
    description = stringifyObject(error);
  } else if (
    typeof error === "string" ||
    typeof error === "number" ||
    typeof error === "boolean" ||
    typeof error === "bigint"
  ) {
    description = describePrimitive(error);
  } else {
    description = typeof error;
  }
  return description;
}

export function reportFoblesError(message: string, error?: unknown, context?: Record<string, unknown>): void {
  const normalized = error instanceof Error ? error : undefined;
  currentError = {
    message,
    errorMessage: normalized?.message ?? describeUnknownError(error),
    stack: normalized?.stack,
    context,
  };
  extensionLog.error(message, { error, context });
  listeners.forEach((listener) => listener());
}

export function clearFoblesError(): void {
  currentError = undefined;
  listeners.forEach((listener) => listener());
}

export function getFoblesErrorSnapshot(): FoblesErrorRecord | undefined {
  return currentError;
}

export function subscribeFoblesError(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
