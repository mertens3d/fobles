// @source-path [fobles] src/content/sitecore-harvester/background-tab/worker-tab-handler.ts

import { extensionLog } from "../../logger";
import { REFERENCE_GRAPH } from "../../../constants/graph.const";
import { executeWorkerTask } from "./worker-task-executor";
import type {
  WorkerReadyMessage,
  WorkerTaskCancelMessage,
  WorkerTaskExecuteMessage,
} from "../worker-pool/worker.messages";

const MESSAGE_TYPE = REFERENCE_GRAPH.BACKGROUND_HARVEST.MESSAGE.TYPE;

type WorkerTabIncomingMessage = WorkerTaskExecuteMessage | WorkerTaskCancelMessage;

const activeTaskControllers = new Map<string, AbortController>();

function taskKey(requestId: string, taskId: string): string {
  return `${requestId}:${taskId}`;
}

// Generic worker-tab content script: every top-frame tab registers this handler (it's inert
// unless the service worker's BackgroundWorkerPool specifically targets this tab's id). Knows
// nothing about progress UI, DataTree, GraphNodes, or whether a request is initial/lazy/reroot -
// it only executes the single WorkerTask it's handed and returns a serializable WorkerTaskResult.
export function registerWorkerTabHandler(): void {
  if (window.top !== window) {
    return;
  }

  chrome.runtime.onMessage.addListener(
    (message: WorkerTabIncomingMessage, _sender, sendResponse) => {
      if (message.type === MESSAGE_TYPE.WORKER_TASK_CANCEL) {
        activeTaskControllers
          .get(taskKey(message.requestId, message.taskId))
          ?.abort();
        return;
      }

      if (message.type !== MESSAGE_TYPE.WORKER_TASK_EXECUTE) {
        return;
      }

      const { task } = message;
      const controller = new AbortController();
      activeTaskControllers.set(taskKey(task.requestId, task.taskId), controller);

      void executeWorkerTask(document, task, controller.signal)
        .then(sendResponse)
        .catch((error: unknown) => {
          extensionLog.error("Worker tab task failed", { task, error });
          sendResponse(undefined);
        })
        .finally(() => {
          activeTaskControllers.delete(taskKey(task.requestId, task.taskId));
        });

      return true;
    },
  );

  void chrome.runtime.sendMessage({
    type: MESSAGE_TYPE.WORKER_READY,
  } satisfies WorkerReadyMessage);
}
