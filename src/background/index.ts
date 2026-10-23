// @source-path [fobles] src/background/index.ts

/// <reference types="chrome" />

import { LOGGER, MESSAGE } from "../constants/extension-const";
import { REFERENCE_GRAPH } from "../constants/graph.const";
import { extensionLog } from "../content/logger";
import {
  clearHostWorkerIframeTargets,
  markWorkerIframeReady,
} from "../content/sitecore-worker/iframe/worker-iframe-service";
import {
  adoptWorkerTab,
  cancelPoolRequest,
  cancelPoolTask,
  disposeWorkerPool,
  handleWorkerReady,
  handleWorkerTabRemoved,
  clearWorkerPoolForHost,
  runPoolTask,
} from "../content/sitecore-worker/pool/background-worker-pool";
import {
  WORKER_IFRAME_READY_MESSAGE_TYPE,
  type PoolCancelRequestMessage,
  type PoolCancelTaskMessage,
  type PoolDisposeMessage,
  type PoolRunTaskMessage,
  type WorkerAdoptedMessage,
  type WorkerIframeReadyMessage,
  type WorkerReadyMessage,
} from "../content/sitecore-worker/transport/worker.messages";
import { appendPersistedLogEntry, clearPersistedLogEntries } from "../shared/logging/persisted-log-storage";
import type { PersistedLogMessage } from "../shared/persisted-log.types";

const MESSAGE_TYPE = REFERENCE_GRAPH.BACKGROUND_HARVEST.MESSAGE.TYPE;
const REFERENCE_GRAPH_LOCK_ACQUIRE = "FOBLES_REFERENCE_GRAPH_LOCK_ACQUIRE";
const REFERENCE_GRAPH_LOCK_RELEASE = "FOBLES_REFERENCE_GRAPH_LOCK_RELEASE";
let activeReferenceGraphHostTabId: number | undefined;

const RELAYED_COMMANDS: readonly string[] = [
  MESSAGE.ACTION.TOGGLE_FOBLES,
  MESSAGE.ACTION.TOGGLE_LBOLT,
];

type ReferenceGraphLockMessage =
  | { type: "FOBLES_REFERENCE_GRAPH_LOCK_ACQUIRE" }
  | { type: "FOBLES_REFERENCE_GRAPH_LOCK_RELEASE" };

type RuntimeMessage =
  | RuntimeReloadMessage
  | ReferenceGraphLockMessage
  | PoolRunTaskMessage
  | PoolCancelRequestMessage
  | PoolCancelTaskMessage
  | PoolDisposeMessage
  | WorkerReadyMessage
  | WorkerIframeReadyMessage
  | WorkerAdoptedMessage
  | PersistedLogMessage;

interface RuntimeReloadMessage {
  action: string;
}

chrome.commands?.onCommand?.addListener((command: string) => {
  if (RELAYED_COMMANDS.includes(command)) {
    chrome.tabs?.query(
      { active: true, currentWindow: true },
      (tabs: Array<{ id?: number }>) => {
        const activeTab = tabs[0];

        if (activeTab?.id !== undefined) {
          void chrome.tabs?.sendMessage(activeTab.id, {
            action: command,
          });
        }
      },
    );
  }
});

chrome.tabs?.onRemoved?.addListener((tabId: number) => {
  clearHostWorkerIframeTargets(tabId);
  clearWorkerPoolForHost(tabId);
  handleWorkerTabRemoved(tabId);
  if (activeReferenceGraphHostTabId === tabId) activeReferenceGraphHostTabId = undefined;
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

    if ("type" in request && request.type === REFERENCE_GRAPH_LOCK_ACQUIRE) {
      const hostTabId = sender.tab?.id;
      const acquired = hostTabId !== undefined && (activeReferenceGraphHostTabId === undefined || activeReferenceGraphHostTabId === hostTabId);
      if (acquired) activeReferenceGraphHostTabId = hostTabId;
      sendResponse({ acquired });
    } else if ("type" in request && request.type === REFERENCE_GRAPH_LOCK_RELEASE) {
      if (activeReferenceGraphHostTabId === sender.tab?.id) activeReferenceGraphHostTabId = undefined;
      sendResponse({ released: true });
    } else if (
      "type" in request &&
      request.type === MESSAGE_TYPE.FOBLES_PERSIST_LOG
    ) {
      void appendPersistedLogEntry(request.entry).catch((error) => {
        extensionLog.error(
          LOGGER.NAMESPACE,
          "Failed to persist log entry",
          error,
        );
      });
    } else if (
      "action" in request &&
      request.action === MESSAGE.ACTION.RELOAD_EXTENSION
    ) {
      void clearPersistedLogEntries()
        .catch((error: unknown) => {
          extensionLog.error(
            LOGGER.NAMESPACE,
            "Failed to clear persisted logs before extension reload",
            error,
          );
        })
        .finally(() => {
          if (sender.tab?.id !== undefined) {
            void chrome.tabs?.reload?.(sender.tab.id);
          }

          chrome.runtime?.reload?.();
        });
    } else if (
      "type" in request &&
      request.type === WORKER_IFRAME_READY_MESSAGE_TYPE
    ) {
      const hostTabId = sender.tab?.id;
      const frameId = sender.frameId;

      if (
        hostTabId !== undefined &&
        frameId !== undefined &&
        frameId !== 0
      ) {
        markWorkerIframeReady(
          request.workerId,
          hostTabId,
          frameId,
        );
      }
    } else if (
      "type" in request &&
      request.type === MESSAGE_TYPE.WORKER_READY
    ) {
      handleWorkerReady(sender.tab?.id);
    } else if (
      "type" in request &&
      request.type === MESSAGE_TYPE.WORKER_ADOPTED
    ) {
      adoptWorkerTab(sender.tab?.id);
    } else if (
      "type" in request &&
      request.type === MESSAGE_TYPE.POOL_CANCEL_REQUEST
    ) {
      cancelPoolRequest(request.requestId, sender.tab?.id);
    } else if (
      "type" in request &&
      request.type === MESSAGE_TYPE.POOL_CANCEL_TASK
    ) {
      cancelPoolTask(request.requestId, request.taskId, sender.tab?.id);
    } else if (
      "type" in request &&
      request.type === MESSAGE_TYPE.POOL_DISPOSE
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
      request.type === MESSAGE_TYPE.POOL_RUN_TASK
    ) {
      void runPoolTask(request.task, sender.tab?.id)
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

extensionLog.debug(
  LOGGER.NAMESPACE,
  "Background script loaded",
);