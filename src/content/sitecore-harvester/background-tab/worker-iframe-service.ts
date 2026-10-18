// @source-path [fobles] src/content/sitecore-harvester/background-tab/worker-iframe-service.ts

import { REFERENCE_GRAPH } from "../../../constants/graph.const";
import type {
  WorkerIframeCreateMessage,
  WorkerIframeCreateResult,
  WorkerIframeNavigateMessage,
  WorkerIframeRemoveAllMessage,
  WorkerIframeRemoveMessage,
  WorkerSetOwnedMessage,
  WorkerTaskCancelMessage,
  WorkerTaskExecuteMessage,
} from "../worker-pool/worker.messages";
import {
  WORKER_IFRAME_CREATE_MESSAGE_TYPE,
  WORKER_IFRAME_NAVIGATE_MESSAGE_TYPE,
  WORKER_IFRAME_REMOVE_ALL_MESSAGE_TYPE,
  WORKER_IFRAME_REMOVE_MESSAGE_TYPE,
} from "../worker-pool/worker.messages";
import type {
  WorkerTask,
  WorkerTaskExecutionResult,
} from "../worker-pool/worker-task.types";
import { extensionLog } from "../../logger";

const MESSAGE_TYPE =
  REFERENCE_GRAPH.BACKGROUND_HARVEST.MESSAGE.TYPE;

const READY_TIMEOUT_MS = 20000;
const SEND_RETRY_DELAY_MS = 50;
const MAX_SEND_ATTEMPTS = 50;

export type WorkerIframeTarget = {
  kind: "iframe";
  workerId: string;
  hostTabId: number;
  frameId: number;
};

type PendingWorkerReady = {
  resolve: (target: WorkerIframeTarget) => void;
  reject: (error: Error) => void;
  timeoutId: ReturnType<typeof setTimeout>;
};

const targetByWorkerId = new Map<string, WorkerIframeTarget>();
const pendingReadyByWorkerId = new Map<string, PendingWorkerReady>();

export async function createWorkerIframeTarget(
  hostTabId: number,
  url: string,
): Promise<WorkerIframeTarget> {
  const message: WorkerIframeCreateMessage = {
    type: WORKER_IFRAME_CREATE_MESSAGE_TYPE,
    url,
  };

  const created = await chrome.tabs.sendMessage<
    WorkerIframeCreateMessage,
    WorkerIframeCreateResult | undefined
  >(hostTabId, message, {
    frameId: 0,
  });

  if (!created?.workerId) {
    throw new Error("Worker iframe host did not create an iframe");
  }

  return await waitForWorkerIframeReady(created.workerId);
}

export async function navigateWorkerIframeTarget(
  target: WorkerIframeTarget,
  url: string,
): Promise<WorkerIframeTarget> {
  clearWorkerIframeTarget(target.workerId);

  const readyPromise = waitForWorkerIframeReady(target.workerId);

  const message: WorkerIframeNavigateMessage = {
    type: WORKER_IFRAME_NAVIGATE_MESSAGE_TYPE,
    workerId: target.workerId,
    url,
  };

  const navigated = await chrome.tabs.sendMessage<
    WorkerIframeNavigateMessage,
    boolean
  >(target.hostTabId, message, {
    frameId: 0,
  });

  if (!navigated) {
    const error = new Error(
      "Worker iframe host did not navigate the iframe",
    );

    rejectPendingReady(target.workerId, error);

    throw error;
  }

  return await readyPromise;
}

export async function removeWorkerIframeTarget(
  target: WorkerIframeTarget,
): Promise<void> {
  clearWorkerIframeTarget(target.workerId);

  const message: WorkerIframeRemoveMessage = {
    type: WORKER_IFRAME_REMOVE_MESSAGE_TYPE,
    workerId: target.workerId,
  };

  try {
    await chrome.tabs.sendMessage<
      WorkerIframeRemoveMessage,
      boolean
    >(target.hostTabId, message, {
      frameId: 0,
    });
  } catch {
    // The host tab or iframe may already have been removed.
  }
}

export async function removeAllWorkerIframeTargets(
  hostTabId: number,
): Promise<void> {
  clearHostWorkerIframeTargets(hostTabId);

  const message: WorkerIframeRemoveAllMessage = {
    type: WORKER_IFRAME_REMOVE_ALL_MESSAGE_TYPE,
  };

  try {
    await chrome.tabs.sendMessage<
      WorkerIframeRemoveAllMessage,
      boolean
    >(hostTabId, message, {
      frameId: 0,
    });
  } catch {
    // The host tab may already have been removed.
  }
}

export async function markWorkerIframeOwned(
  target: WorkerIframeTarget,
): Promise<void> {
  const message: WorkerSetOwnedMessage = {
    type: MESSAGE_TYPE.WORKER_SET_OWNED,
  };

  await chrome.tabs.sendMessage(
    target.hostTabId,
    message,
    {
      frameId: target.frameId,
    },
  );
}

export async function sendTaskToWorkerIframe(
  target: WorkerIframeTarget,
  task: WorkerTask,
): Promise<WorkerTaskExecutionResult | undefined> {
  const message: WorkerTaskExecuteMessage = {
    type: MESSAGE_TYPE.WORKER_TASK_EXECUTE,
    task,
  };

  let attempt = 0;
  let result: WorkerTaskExecutionResult | undefined;

  while (attempt < MAX_SEND_ATTEMPTS) {
    attempt += 1;

    try {
      result = await chrome.tabs.sendMessage<
        WorkerTaskExecuteMessage,
        WorkerTaskExecutionResult | undefined
      >(target.hostTabId, message, {
        frameId: target.frameId,
      });

      return result;
    } catch (error) {
      if (!isMissingReceiverError(error)) {
        throw error;
      }

      await delay(SEND_RETRY_DELAY_MS);
    }
  }

  return result;
}

export function sendCancelToWorkerIframe(
  target: WorkerIframeTarget,
  requestId: string,
  taskId: string,
): void {
  const message: WorkerTaskCancelMessage = {
    type: MESSAGE_TYPE.WORKER_TASK_CANCEL,
    requestId,
    taskId,
  };

  void chrome.tabs
    .sendMessage(
      target.hostTabId,
      message,
      {
        frameId: target.frameId,
      },
    )
    .catch(() => {
      // The iframe may already have navigated or been removed.
    });
}

export function markWorkerIframeReady(
  workerId: string,
  hostTabId: number,
  frameId: number,
): WorkerIframeTarget {
  const target: WorkerIframeTarget = {
    kind: "iframe",
    workerId,
    hostTabId,
    frameId,
  };
  extensionLog.debug("Worker iframe service: ready", {
    workerId,
    hostTabId,
    frameId,
  });
  targetByWorkerId.set(workerId, target);

  const pending = pendingReadyByWorkerId.get(workerId);

  if (pending) {
    clearTimeout(pending.timeoutId);
    pendingReadyByWorkerId.delete(workerId);
    pending.resolve(target);
  }

  return target;
}

export function clearHostWorkerIframeTargets(
  hostTabId: number,
): void {
  const workerIds = Array.from(targetByWorkerId.entries())
    .filter(([, target]) => target.hostTabId === hostTabId)
    .map(([workerId]) => workerId);

  workerIds.forEach(clearWorkerIframeTarget);
}

// Re-waits for readiness without asking the host to re-navigate the iframe - used when the
// iframe's OWN page triggered its own reload (e.g. a Sitecore ribbon postback), not us.
export function waitForWorkerIframeReload(
  workerId: string,
): Promise<WorkerIframeTarget> {
  clearWorkerIframeTarget(workerId);

  return waitForWorkerIframeReady(workerId);
}

function waitForWorkerIframeReady(
  workerId: string,
): Promise<WorkerIframeTarget> {
  const existingTarget = targetByWorkerId.get(workerId);

  if (existingTarget) {
    return Promise.resolve(existingTarget);
  }

  return new Promise((resolve, reject) => {
    rejectPendingReady(
      workerId,
      new Error("Worker iframe readiness was superseded"),
    );

    const timeoutId = setTimeout(() => {
      pendingReadyByWorkerId.delete(workerId);

      reject(
        new Error(
          `Worker iframe did not become ready: ${workerId}`,
        ),
      );
    }, READY_TIMEOUT_MS);

    pendingReadyByWorkerId.set(workerId, {
      resolve,
      reject,
      timeoutId,
    });
  });
}

function rejectPendingReady(
  workerId: string,
  error: Error,
): void {
  const pending = pendingReadyByWorkerId.get(workerId);

  if (pending) {
    clearTimeout(pending.timeoutId);
    pendingReadyByWorkerId.delete(workerId);
    pending.reject(error);
  }
}

function clearWorkerIframeTarget(
  workerId: string,
): void {
  targetByWorkerId.delete(workerId);

  rejectPendingReady(
    workerId,
    new Error(`Worker iframe was removed: ${workerId}`),
  );
}

function isMissingReceiverError(
  error: unknown,
): boolean {
  return (
    error instanceof Error &&
    error.message.includes("Receiving end does not exist")
  );
}

async function delay(
  delayMs: number,
): Promise<void> {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, delayMs);
  });
}