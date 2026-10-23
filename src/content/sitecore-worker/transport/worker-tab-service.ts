// @source-path [fobles] src/content/sitecore-worker/transport/worker-tab-service.ts

import { REFERENCE_GRAPH } from "../../../constants/graph.const";
import { extensionLog } from "../../logger";
import type { WorkerSetOwnedMessage, WorkerTaskExecuteMessage } from "./worker.messages";
import type { WorkerTask, WorkerTaskExecutionResult } from "../tasks/worker-task.types";

const MESSAGE_TYPE = REFERENCE_GRAPH.BACKGROUND_HARVEST.MESSAGE.TYPE;

export async function createWorkerTab(url: string, active: boolean): Promise<number | undefined> {
  const tab = await chrome.tabs.create({ url, active });

  return tab.id;
}

export async function navigateWorkerTab(tabId: number, url: string): Promise<void> {
  await chrome.tabs.update(tabId, { url });
}

export async function closeWorkerTab(tabId: number): Promise<void> {
  try {
    await chrome.tabs.remove(tabId);
  } catch (error) {
    extensionLog.debug("Worker pool: tab already closed", { tabId, error });
  }
}

export async function markWorkerTabOwned(tabId: number): Promise<void> {
  const message: WorkerSetOwnedMessage = { type: MESSAGE_TYPE.WORKER_SET_OWNED };

  await chrome.tabs.sendMessage(tabId, message, { frameId: 0 });
}

export async function sendTaskToWorkerTab(
  tabId: number,
  task: WorkerTask,
): Promise<WorkerTaskExecutionResult | undefined> {
  const message: WorkerTaskExecuteMessage = { type: MESSAGE_TYPE.WORKER_TASK_EXECUTE, task };

  let attempt = 0;
  const maxAttempts = 50;

  let result: WorkerTaskExecutionResult | undefined = undefined;

  while (attempt < maxAttempts) {
    attempt += 1;

    try {
      result = await chrome.tabs.sendMessage<WorkerTaskExecuteMessage, WorkerTaskExecutionResult | undefined>(
        tabId,
        message,
        { frameId: 0 },
      );

      return result;
    } catch (error) {
      const receivingEndMissing = error instanceof Error && error.message.includes("Receiving end does not exist");

      if (!receivingEndMissing) {
        throw error;
      }

      await new Promise<void>((resolve) => {
        setTimeout(resolve, 50);
      });
    }
  }

  extensionLog.debug("Worker pool: max send attempts reached", { tabId, task });

  return result;
}

export function sendCancelToWorkerTab(tabId: number, requestId: string, taskId: string): void {
  void chrome.tabs
    .sendMessage(tabId, { type: MESSAGE_TYPE.WORKER_TASK_CANCEL, requestId, taskId }, { frameId: 0 })
    .catch((error: unknown) => {
      extensionLog.debug("Worker pool: failed to deliver cancel", { tabId, requestId, taskId, error });
    });
}
