// @source-path [fobles] src/content/logger.ts

import { LOGGER, STORAGE } from "../constants/extension-constants";
import { REFERENCE_GRAPH } from "../constants/graph.const";
import {
  appendPersistedLogEntry,
} from "../shared/logging/persisted-log-storage";
import type {
  PersistedLogContext,
  PersistedLogEntry,
  PersistedLogLevel,
  PersistedLogMessage,
} from "../shared/persisted-log.types";
import type { Logger } from "./content.types";

type FoblesGlobal = typeof globalThis & {
  __sitecoreFoblesDebug?: boolean;
  __sitecoreFoblesPersistLogs?: boolean;
};

const foblesGlobal =
  globalThis as FoblesGlobal;

void chrome.storage?.sync
  ?.get(STORAGE.KEY.PERSIST_DEBUG_LOGS)
  .then((result) => {
    setPersistedLoggingEnabled(
      result[
        STORAGE.KEY.PERSIST_DEBUG_LOGS
      ] === true,
    );
  })
  .catch(() => {
    setPersistedLoggingEnabled(false);
  });

chrome.storage?.onChanged?.addListener(
  (changes, areaName) => {
    if (
      areaName === "sync" &&
      STORAGE.KEY.PERSIST_DEBUG_LOGS in
        changes
    ) {
      setPersistedLoggingEnabled(
        changes[
          STORAGE.KEY.PERSIST_DEBUG_LOGS
        ].newValue === true,
      );
    }
  },
);

const isDebugEnabled =
  (): boolean =>
    Boolean(
      foblesGlobal.__sitecoreFoblesDebug,
    );

const isPersistedLoggingEnabled =
  (): boolean =>
    Boolean(
      foblesGlobal.__sitecoreFoblesPersistLogs,
    );

export function setExtensionDebugEnabled(
  enabled: boolean,
): void {
  foblesGlobal.__sitecoreFoblesDebug =
    enabled;
}

export function setPersistedLoggingEnabled(
  enabled: boolean,
): void {
  foblesGlobal.__sitecoreFoblesPersistLogs =
    enabled;
}

function getLogContext():
  PersistedLogContext {
  return typeof document === "undefined"
    ? "background"
    : "content";
}

function sanitizeValue(
  value: unknown,
  visited: WeakSet<object>,
): unknown {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (value === undefined) {
    return "[undefined]";
  }

  if (typeof value === "bigint") {
    return value.toString();
  }

  if (
    typeof value === "function" ||
    typeof value === "symbol"
  ) {
    return String(value);
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
    };
  }

  if (
    typeof Node !== "undefined" &&
    value instanceof Node
  ) {
    return {
      nodeName: value.nodeName,
      textContent: value.textContent,
    };
  }

  if (visited.has(value)) {
    return "[Circular]";
  }

  visited.add(value);

  if (Array.isArray(value)) {
    return value.map((item) =>
      sanitizeValue(
        item,
        visited,
      ),
    );
  }

  const result:
    Record<string, unknown> = {};

  for (
    const [
      key,
      propertyValue,
    ] of Object.entries(value)
  ) {
    result[key] =
      sanitizeValue(
        propertyValue,
        visited,
      );
  }

  return result;
}

function sanitizeArgs(
  args: unknown[],
): unknown[] {
  return args.map((arg) =>
    sanitizeValue(
      arg,
      new WeakSet<object>(),
    ),
  );
}

function persistLog(
  level: PersistedLogLevel,
  args: unknown[],
): void {
  if (
    isPersistedLoggingEnabled()
  ) {
    const context =
      getLogContext();

    const entry:
      PersistedLogEntry = {
        id: crypto.randomUUID(),
        timestamp:
          new Date().toISOString(),
        level,
        context,
        args: sanitizeArgs(args),
      };

    if (
      context === "background"
    ) {
      void appendPersistedLogEntry(
        entry,
      ).catch(() => {
        // Persisted logging must not
        // recursively log its own failure.
      });
    } else {
      const message:
        PersistedLogMessage = {
          type:
            REFERENCE_GRAPH
              .BACKGROUND_HARVEST
              .MESSAGE.TYPE
              .FOBLES_PERSIST_LOG,
          entry,
        };

      void chrome.runtime
        ?.sendMessage(message)
        .catch(() => {
          // The extension context may
          // have been reloaded.
        });
    }
  }
}

export const extensionLog:
  Logger = {
    debug: (...args: unknown[]) => {
      if (isDebugEnabled()) {
        console.log(
          LOGGER.NAMESPACE,
          ...args,
        );
      }

      persistLog(
        "debug",
        args,
      );
    },

    info: (...args: unknown[]) => {
      if (isDebugEnabled()) {
        console.info(
          LOGGER.NAMESPACE,
          ...args,
        );
      }

      persistLog(
        "info",
        args,
      );
    },

    warn: (...args: unknown[]) => {
      if (isDebugEnabled()) {
        console.warn(
          LOGGER.NAMESPACE,
          ...args,
        );
      }

      persistLog(
        "warn",
        args,
      );
    },

    error: (...args: unknown[]) => {
      console.error(
        LOGGER.NAMESPACE,
        ...args,
      );

      persistLog(
        "error",
        args,
      );
    },
  };