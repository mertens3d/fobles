// @source-path [fobles] src/background/index.ts

/// <reference types="chrome" />

import { LOGGER, MESSAGE } from "../constants/extension-constants";
import { REFERENCE_GRAPH } from "../constants/graph.const";
import { extensionLog } from "../content/logger";
import {
  adoptWorkerTab,
  cancelPoolRequest,
  disposeWorkerPool,
  handleWorkerReady,
  handleWorkerTabRemoved,
  runPoolTask,
} from "../content/sitecore-harvester/worker-pool/background-worker-pool";
import type {
  PoolCancelRequestMessage,
  PoolDisposeMessage,
  WorkerAdoptedMessage,
  PoolRunTaskMessage,
  WorkerReadyMessage,
} from "../content/sitecore-harvester/worker-pool/worker.messages";
import { appendPersistedLogEntry } from "../shared/logging/persisted-log-storage";
import type { PersistedLogMessage } from "../shared/persisted-log.types";

const RELAYED_COMMANDS: readonly string[] = [
  MESSAGE.ACTION.TOGGLE_FOBLES,
  MESSAGE.ACTION.TOGGLE_LBOLT,
];

chrome.commands?.onCommand?.addListener((command: string) => {
  if (!RELAYED_COMMANDS.includes(command)) return;

  chrome.tabs?.query(
    { active: true, currentWindow: true },
    (tabs: Array<{ id?: number }>) => {
      const activeTab = tabs[0];
      if (activeTab?.id !== undefined) {
        void chrome.tabs?.sendMessage(activeTab.id, { action: command });
      }
    },
  );
});

type RuntimeMessage =
  | RuntimeReloadMessage
  | PoolRunTaskMessage
  | PoolCancelRequestMessage
  | PoolDisposeMessage
  | WorkerReadyMessage
  | WorkerAdoptedMessage
  | PersistedLogMessage;

interface RuntimeReloadMessage {
  action: string;
}

chrome.tabs?.onRemoved?.addListener((tabId: number) => {
  handleWorkerTabRemoved(tabId);
});

chrome.runtime.onSuspend?.addListener(() => {
  void disposeWorkerPool();
});

chrome.runtime.onMessage.addListener(
  (
    request: RuntimeMessage,
    sender,
    sendResponse,
  ) => {
    let keepMessageChannelOpen = false;

    if (
      "type" in request &&
      request.type ===
        REFERENCE_GRAPH
          .BACKGROUND_HARVEST
          .MESSAGE
          .TYPE
          .FOBLES_PERSIST_LOG
    ) {
      void appendPersistedLogEntry(
        request.entry,
      ).catch((error) => {
        extensionLog.error(
          LOGGER.NAMESPACE,
          "Failed to persist log entry",
          error,
        );
      });
    } else if (
      "action" in request &&
      request.action ===
        MESSAGE.ACTION.RELOAD_EXTENSION
    ) {
      if (
        sender.tab?.id !== undefined
      ) {
        void chrome.tabs?.reload?.(
          sender.tab.id,
        );
      }

      chrome.runtime?.reload?.();
    } else if (
      "type" in request &&
      request.type ===
        REFERENCE_GRAPH
          .BACKGROUND_HARVEST
          .MESSAGE
          .TYPE
          .WORKER_READY
    ) {
      handleWorkerReady(
        sender.tab?.id,
      );
    } else if (
      "type" in request &&
      request.type ===
        REFERENCE_GRAPH
          .BACKGROUND_HARVEST
          .MESSAGE
          .TYPE
          .WORKER_ADOPTED
    ) {
      adoptWorkerTab(
        sender.tab?.id,
      );
    } else if (
      "type" in request &&
      request.type ===
        REFERENCE_GRAPH
          .BACKGROUND_HARVEST
          .MESSAGE
          .TYPE
          .POOL_CANCEL_REQUEST
    ) {
      cancelPoolRequest(
        request.requestId,
      );
    } else if (
      "type" in request &&
      request.type ===
        REFERENCE_GRAPH
          .BACKGROUND_HARVEST
          .MESSAGE
          .TYPE
          .POOL_DISPOSE
    ) {
      void disposeWorkerPool()
        .then(() => {
          sendResponse(undefined);
        })
        .catch((error: unknown) => {
          extensionLog.error(
            LOGGER.NAMESPACE,
            "Failed to dispose worker pool",
            error,
          );

          sendResponse(undefined);
        });

      keepMessageChannelOpen = true;
    } else if (
      "type" in request &&
      request.type ===
        REFERENCE_GRAPH
          .BACKGROUND_HARVEST
          .MESSAGE
          .TYPE
          .POOL_RUN_TASK
    ) {
      void runPoolTask(
        request.task,
      )
        .then((result) => {
          sendResponse(result);
        })
        .catch((error: unknown) => {
          extensionLog.error(
            LOGGER.NAMESPACE,
            "Worker pool task failed",
            error,
          );

          sendResponse(undefined);
        });

      keepMessageChannelOpen = true;
    }

    return keepMessageChannelOpen;
  },
);
extensionLog.debug(LOGGER.NAMESPACE, "Background script loaded");
