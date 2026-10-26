// @source-path [fobles] src/content/foundation/workers/transport/worker-target-service.ts
import { CONST } from "../../../../constants/const";
import {
  createWorkerIframeTarget,
  markWorkerIframeOwned,
  navigateWorkerIframeTarget,
  removeWorkerIframeTarget,
  sendCancelToWorkerIframe,
  sendTaskToWorkerIframe,
} from "../iframe/worker-iframe-service";
import {
  closeWorkerTab,
  createWorkerTab,
  markWorkerTabOwned,
  navigateWorkerTab,
  sendCancelToWorkerTab,
  sendTaskToWorkerTab,
} from "./worker-tab-service";
import type { WorkerTask, WorkerTaskExecutionResult } from "../tasks/worker-task.types";
import {
  isWorkerIframeTarget,
  isWorkerTabTarget,
  type WorkerTarget,
} from "../pool/worker-target";

export async function createWorkerTarget(
  hostTabId: number | undefined,
  url: string,
  active: boolean,
): Promise<WorkerTarget | undefined> {
  let target: WorkerTarget | undefined;
  if (CONST.FOBLES.WORKER_POOL.USE_WORKER_IFRAMES && hostTabId !== undefined) {
    target = await createWorkerIframeTarget(hostTabId, url);
  } else {
    const tabId = await createWorkerTab(url, active);
    if (tabId !== undefined) target = { kind: "tab", tabId };
  }
  return target;
}

export async function navigateWorkerTarget(
  target: WorkerTarget,
  url: string,
): Promise<WorkerTarget> {
  let updatedTarget = target;
  if (isWorkerIframeTarget(target)) {
    updatedTarget = await navigateWorkerIframeTarget(target, url);
  } else {
    await navigateWorkerTab(target.tabId, url);
  }
  return updatedTarget;
}

export async function closeWorkerTarget(target: WorkerTarget): Promise<void> {
  if (isWorkerIframeTarget(target)) {
    await removeWorkerIframeTarget(target);
  } else {
    await closeWorkerTab(target.tabId);
  }
}

export async function markWorkerTargetOwned(target: WorkerTarget): Promise<void> {
  if (isWorkerIframeTarget(target)) {
    await markWorkerIframeOwned(target);
  } else {
    await markWorkerTabOwned(target.tabId);
  }
}

export async function sendTaskToWorkerTarget(
  target: WorkerTarget,
  task: WorkerTask,
): Promise<WorkerTaskExecutionResult | undefined> {
  let result: WorkerTaskExecutionResult | undefined;
  if (isWorkerIframeTarget(target)) {
    result = await sendTaskToWorkerIframe(target, task);
  } else {
    result = await sendTaskToWorkerTab(target.tabId, task);
  }
  return result;
}

export function sendCancelToWorkerTarget(
  target: WorkerTarget,
  requestId: string,
  taskId: string,
): void {
  if (isWorkerIframeTarget(target)) {
    sendCancelToWorkerIframe(target, requestId, taskId);
  } else {
    sendCancelToWorkerTab(target.tabId, requestId, taskId);
  }
}

export function getWorkerTargetKey(target: WorkerTarget): string {
  return isWorkerTabTarget(target) ? `tab:${target.tabId}` : `iframe:${target.workerId}`;
}

export function getWorkerTargetTabId(target: WorkerTarget): number {
  return isWorkerTabTarget(target) ? target.tabId : target.hostTabId;
}
