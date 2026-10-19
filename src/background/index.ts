// @source-path [fobles] src/background/index.ts

/// <reference types="chrome" />

import { LOGGER, MESSAGE } from "../constants/extension-const";
import { REFERENCE_GRAPH } from "../constants/graph.const";
import { extensionLog } from "../content/logger";
import {
  clearHostWorkerIframeTargets,
  markWorkerIframeReady,
} from "../content/sitecore-harvester/background-tab/worker-iframe-service";
import {
  adoptWorkerTab,
  cancelPoolRequest,
  cancelPoolTask,
  disposeWorkerPool,
  handleWorkerReady,
  handleWorkerTabRemoved,
  runPoolTask,
} from "../content/sitecore-harvester/worker-pool/background-worker-pool";
import {
  WORKER_IFRAME_READY_MESSAGE_TYPE,
  type PoolCancelRequestMessage,
  type PoolCancelTaskMessage,
  type PoolDisposeMessage,
  type PoolRunTaskMessage,
  type WorkerAdoptedMessage,
  type WorkerIframeReadyMessage,
  type WorkerReadyMessage,
} from "../content/sitecore-harvester/worker-pool/worker.messages";
import { appendPersistedLogEntry } from "../shared/logging/persisted-log-storage";
import type { PersistedLogMessage } from "../shared/persisted-log.types";

const MESSAGE_TYPE = REFERENCE_GRAPH.BACKGROUND_HARVEST.MESSAGE.TYPE;

const RELAYED_COMMANDS: readonly string[] = [
  MESSAGE.ACTION.TOGGLE_FOBLES,
  MESSAGE.ACTION.TOGGLE_LBOLT,
];

type RuntimeMessage =
  | RuntimeReloadMessage
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
      if (sender.tab?.id !== undefined) {
        void chrome.tabs?.reload?.(sender.tab.id);
      }

      chrome.runtime?.reload?.();
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
        const target = markWorkerIframeReady(
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
      cancelPoolRequest(request.requestId);
    } else if (
      "type" in request &&
      request.type === MESSAGE_TYPE.POOL_CANCEL_TASK
    ) {
      cancelPoolTask(request.requestId, request.taskId);
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