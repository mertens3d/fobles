// @source-path [fobles] src/content/sitecore-harvester/background-tab/worker-target-service.ts

import {
  createWorkerIframeTarget,
  markWorkerIframeOwned,
  navigateWorkerIframeTarget,
  removeWorkerIframeTarget,
  sendCancelToWorkerIframe,
  sendTaskToWorkerIframe,
  waitForWorkerIframeReload,
} from "./worker-iframe-service";
import {
  closeWorkerTab,
  createWorkerTab,
  markWorkerTabOwned,
  navigateWorkerTab,
  sendCancelToWorkerTab,
  sendTaskToWorkerTab,
} from "./worker-tab-service";
import type {
  WorkerTask,
  WorkerTaskExecutionResult,
} from "../worker-pool/worker-task.types";
import {
  resetWorkerReadiness,
  waitForWorkerReady,
} from "../worker-pool/worker-readiness";
import {
  isWorkerIframeTarget,
  isWorkerTabTarget,
  type WorkerTarget,
} from "../worker-pool/worker-target";

const USE_WORKER_IFRAMES = true;
const READY_TIMEOUT_MS = 20000;

export async function createWorkerTarget(
  hostTabId: number | undefined,
  url: string,
  active: boolean,
): Promise<WorkerTarget | undefined> {
  let target: WorkerTarget | undefined;

  if (
    USE_WORKER_IFRAMES &&
    hostTabId !== undefined
  ) {
    target = await createWorkerIframeTarget(
      hostTabId,
      url,
    );
  } else {
    const tabId = await createWorkerTab(
      url,
      active,
    );

    if (tabId !== undefined) {
      target = {
        kind: "tab",
        tabId,
      };
    }
  }

  return target;
}

export async function navigateWorkerTarget(
  target: WorkerTarget,
  url: string,
): Promise<WorkerTarget> {
  let updatedTarget = target;

  if (isWorkerIframeTarget(target)) {
    updatedTarget =
      await navigateWorkerIframeTarget(
        target,
        url,
      );
  } else {
    await navigateWorkerTab(
      target.tabId,
      url,
    );
  }

  return updatedTarget;
}

export async function closeWorkerTarget(
  target: WorkerTarget,
): Promise<void> {
  if (isWorkerIframeTarget(target)) {
    await removeWorkerIframeTarget(
      target,
    );
  } else {
    await closeWorkerTab(
      target.tabId,
    );
  }
}

export async function markWorkerTargetOwned(
  target: WorkerTarget,
): Promise<void> {
  if (isWorkerIframeTarget(target)) {
    await markWorkerIframeOwned(
      target,
    );
  } else {
    await markWorkerTabOwned(
      target.tabId,
    );
  }
}

export async function sendTaskToWorkerTarget(
  target: WorkerTarget,
  task: WorkerTask,
): Promise<WorkerTaskExecutionResult | undefined> {
  let result:
    | WorkerTaskExecutionResult
    | undefined;

  if (isWorkerIframeTarget(target)) {
    result =
      await sendTaskToWorkerIframe(
        target,
        task,
      );
  } else {
    result =
      await sendTaskToWorkerTab(
        target.tabId,
        task,
      );
  }

  return result;
}

export async function waitForWorkerTargetReload(
  target: WorkerTarget,
): Promise<void> {
  if (isWorkerIframeTarget(target)) {
    await waitForWorkerIframeReload(target.workerId);
  } else {
    resetWorkerReadiness(target.tabId);
    await waitForWorkerReady(target.tabId, READY_TIMEOUT_MS);
  }
}

export function sendCancelToWorkerTarget(
  target: WorkerTarget,
  requestId: string,
  taskId: string,
): void {
  if (isWorkerIframeTarget(target)) {
    sendCancelToWorkerIframe(
      target,
      requestId,
      taskId,
    );
  } else {
    sendCancelToWorkerTab(
      target.tabId,
      requestId,
      taskId,
    );
  }
}

export function getWorkerTargetKey(
  target: WorkerTarget,
): string {
  let key: string;

  if (isWorkerTabTarget(target)) {
    key =
      `tab:${target.tabId}`;
  } else {
    key =
      `iframe:${target.workerId}`;
  }

  return key;
}

export function getWorkerTargetTabId(
  target: WorkerTarget,
): number {
  let tabId: number;

  if (isWorkerTabTarget(target)) {
    tabId = target.tabId;
  } else {
    tabId = target.hostTabId;
  }

  return tabId;
}