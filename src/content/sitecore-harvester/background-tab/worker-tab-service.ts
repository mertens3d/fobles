// @source-path [fobles] src/content/sitecore-harvester/background-tab/worker-tab-service.ts

import { REFERENCE_GRAPH } from "../../../constants/graph.const";
import { extensionLog } from "../../logger";
import type { WorkerTask, WorkerTaskResult } from "../worker-pool/worker-task.types";
import type { WorkerTaskExecuteMessage } from "../worker-pool/worker.messages";

const MESSAGE_TYPE = REFERENCE_GRAPH.BACKGROUND_HARVEST.MESSAGE.TYPE;

// Privileged chrome.tabs.* operations only - this module owns tab lifecycle and message
// delivery, nothing about task scheduling, result merging, or the authoritative harvest result.

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

export async function sendTaskToWorkerTab(
  tabId: number,
  task: WorkerTask,
): Promise<WorkerTaskResult | undefined> {
  const message: WorkerTaskExecuteMessage = {
    type: MESSAGE_TYPE.WORKER_TASK_EXECUTE,
    task,
  };

  let attempt = 0;
  const maxAttempts = 50;
  let result: WorkerTaskResult | undefined;

  while (attempt < maxAttempts) {
    attempt++;
    try {
      result = await chrome.tabs.sendMessage<WorkerTaskExecuteMessage, WorkerTaskResult | undefined>(
        tabId,
        message,
        { frameId: 0 },
      );
      return result;
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes("Receiving end does not exist")) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }

  extensionLog.debug("Worker pool: max send attempts reached", { tabId, task });
  return undefined;
}

export function sendCancelToWorkerTab(tabId: number, requestId: string, taskId: string): void {
  void chrome.tabs
    .sendMessage(tabId, {
      type: MESSAGE_TYPE.WORKER_TASK_CANCEL,
      requestId,
      taskId,
    }, { frameId: 0 })
    .catch((error: unknown) => {
      extensionLog.debug("Worker pool: failed to deliver cancel", { tabId, requestId, taskId, error });
    });
}
