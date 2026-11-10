// @source-path [fobles] src/content/foundation/workers/transport/worker-tab-handler.ts
import { extensionLog } from "../../../logger";
import { WORKER_MESSAGE_TYPE } from "../worker-protocol.const";
import type { WorkerTask } from "../tasks/worker-task.types";
import {
  WORKER_IFRAME_READY_MESSAGE_TYPE,
} from "./worker.messages";
import {
  type WorkerIframeReadyMessage,
  type WorkerReadyMessage,
  type WorkerTabIncomingMessage
} from "./PoolRunTaskMessage.types";
import type { ExecuteWorkerTask, IsWorkerDocumentReady } from "./ExecuteWorkerTask";

const MESSAGE_TYPE = WORKER_MESSAGE_TYPE;
const WORKER_BANNER_ID = "fobles-background-worker-banner";
const WORKER_ID_QUERY_PARAMETER = "foblesWorker";
const READY_TIMEOUT_MS = 20000;
const READY_POLL_INTERVAL_MS = 100;
const activeTaskControllers = new Map<string, AbortController>();
const WORKER_ACTIVITY_ID = `${WORKER_BANNER_ID}-activity`;

function taskKey(requestId: string, taskId: string): string {
  return `${requestId}:${taskId}`;
}

function readIframeWorkerId(): string | undefined {
  const workerId = new URL(window.location.href).searchParams.get(WORKER_ID_QUERY_PARAMETER);
  return window.top !== window && workerId ? workerId : undefined;
}

export function registerWorkerTabHandler(
  executeWorkerTask: ExecuteWorkerTask,
  isWorkerDocumentReady: IsWorkerDocumentReady,
): void {
  const iframeWorkerId = readIframeWorkerId();
  const isTopLevel = window.top === window;
  if (!isTopLevel && !iframeWorkerId) {
    return;
  }
  chrome.runtime.onMessage.addListener((message: WorkerTabIncomingMessage, _sender, sendResponse) => {
    let keepMessageChannelOpen = false;
    if (message.type === MESSAGE_TYPE.WORKER_SET_OWNED) {
      addWorkerBanner(document);
    } else if (message.type === MESSAGE_TYPE.WORKER_TASK_CANCEL) {
      activeTaskControllers.get(taskKey(message.requestId, message.taskId))?.abort();
    } else if (message.type === MESSAGE_TYPE.WORKER_TASK_EXECUTE) {
      const { task } = message;
      const controller = new AbortController();
      activeTaskControllers.set(taskKey(task.requestId, task.taskId), controller);
      updateWorkerActivity(document, task, "Running");
      void executeWorkerTask(document, task, controller.signal)
        .then((result) => {
          updateWorkerActivity(document, task, result.status === "success" ? "Completed" : "Failed");
          sendResponse(result);
        })
        .catch((error: unknown) => {
          updateWorkerActivity(document, task, "Failed");
          extensionLog.error("Worker task failed", { task, error });
          sendResponse(undefined);
        })
        .finally(() => {
          activeTaskControllers.delete(taskKey(task.requestId, task.taskId));
        });
      keepMessageChannelOpen = true;
    }
    return keepMessageChannelOpen;
  });
  if (iframeWorkerId) {
    void announceIframeReadyWhenStable(iframeWorkerId, isWorkerDocumentReady);
  } else {
    void chrome.runtime.sendMessage({ type: MESSAGE_TYPE.WORKER_READY } satisfies WorkerReadyMessage);
  }
}

async function announceIframeReadyWhenStable(
  workerId: string,
  isWorkerDocumentReady: IsWorkerDocumentReady,
): Promise<void> {
  const startedAt = performance.now();
  while (performance.now() - startedAt < READY_TIMEOUT_MS) {
    if (document.readyState !== "loading" && isWorkerDocumentReady(document)) {
      extensionLog.debug("Worker transport: Sitecore item document ready", {
        workerId,
        elapsedMs: Math.round(performance.now() - startedAt),
      });
      await chrome.runtime.sendMessage({
        type: WORKER_IFRAME_READY_MESSAGE_TYPE,
        workerId,
      } satisfies WorkerIframeReadyMessage);
      return;
    }
    await delay(READY_POLL_INTERVAL_MS);
  }
  extensionLog.error("Worker transport: Sitecore item document readiness timed out", {
    workerId,
    elapsedMs: Math.round(performance.now() - startedAt),
    readyState: document.readyState,
  });
}

function addWorkerBanner(doc: Document): void {
  doc.getElementById(WORKER_BANNER_ID)?.remove();
  const overlay = doc.createElement("div");
  overlay.id = WORKER_BANNER_ID;
  overlay.style.cssText = [
    "position:fixed",
    "inset:0",
    "z-index:2147483647",
    "display:flex",
    "align-items:center",
    "justify-content:center",
    "padding:40px",
    "box-sizing:border-box",
    "background:rgba(32,48,71,0.72)",
    "pointer-events:none",
  ].join(";");
  const panel = doc.createElement("div");
  panel.style.cssText = [
    "position:relative",
    "width:min(720px,85vw)",
    "padding:36px 48px",
    "box-sizing:border-box",
    "border:2px solid #2f6fed",
    "border-radius:8px",
    "background:rgba(255,255,255,0.96)",
    "box-shadow:0 12px 40px rgba(0,0,0,0.35)",
    "color:#203047",
    "font-family:Arial,sans-serif",
    "text-align:center",
    "pointer-events:none",
  ].join(";");
  const heading = doc.createElement("div");
  heading.textContent = "Fobles Background Worker";
  heading.style.cssText = ["font-size:28px", "font-weight:700", "margin-bottom:16px"].join(";");
  const message = doc.createElement("div");
  message.textContent =
    "This Sitecore window is being used by Fobles for background processing. It is not intended for normal Sitecore work.";
  message.style.cssText = ["font-size:18px", "line-height:1.5"].join(";");
  const activity = doc.createElement("div");
  activity.id = WORKER_ACTIVITY_ID;
  activity.style.cssText = [
    "margin-top:18px",
    "font-size:14px",
    "line-height:1.5",
    "text-align:left",
    "overflow-wrap:anywhere",
  ].join(";");
  activity.textContent = "Ready for background work";
  panel.append(heading, message, activity);
  overlay.appendChild(panel);
  doc.documentElement.appendChild(overlay);
}

function workerTaskLabel(task: WorkerTask): string {
  switch (task.type) {
    case "get-template-bases":
      return "Reading direct base templates";
    case "get-quick-info":
      return "Reading Quick Info";
    case "get-parent":
      return "Reading parent item";
    case "get-children":
      return "Reading child items";
    case "get-referrers":
      return "Reading referring items";
    case "get-custom-fields":
      return "Reading custom fields";
    case "get-standard-fields":
      return "Reading standard fields";
    case "get-layout":
      return "Reading layout information";
    case "set-raw-values":
      return "Updating raw field values";
    case "set-standard-fields":
      return "Updating standard fields";
  }
}

function workerItemLabel(task: WorkerTask): string {
  try {
    const url = new URL(task.url);
    return (
      url.searchParams.get("id") ?? url.searchParams.get("sc_itemid") ?? url.searchParams.get("fo") ?? url.pathname
    );
  } catch {
    return "Current Sitecore item";
  }
}

function updateWorkerActivity(doc: Document, task: WorkerTask, status: string): void {
  const activity = doc.getElementById(WORKER_ACTIVITY_ID);
  if (!activity) {
    return;
  }
  const friendlyStatus = status === "Running" ? "Working" : status === "Completed" ? "Complete" : "Failed";
  activity.replaceChildren();
  const statusLine = doc.createElement("div");
  statusLine.textContent = `Status: ${friendlyStatus}`;
  const taskLine = doc.createElement("div");
  taskLine.textContent = `Task: ${workerTaskLabel(task)}`;
  const itemLine = doc.createElement("div");
  itemLine.textContent = `Item: ${workerItemLabel(task)}`;
  activity.append(statusLine, taskLine, itemLine);
}

async function delay(delayMs: number): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, delayMs));
}
