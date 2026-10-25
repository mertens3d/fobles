// @source-path [fobles] src/content/sitecore-worker/transport/worker-tab-handler.ts

import { WORKER_MESSAGE_TYPE } from "../worker-protocol.const";
import { extensionLog } from "../../logger";
import type { WorkerTask, WorkerTaskExecutionResult } from "../tasks/worker-task.types";
import { WORKER_IFRAME_READY_MESSAGE_TYPE, type WorkerAdoptedMessage, type WorkerIframeReadyMessage, type WorkerReadyMessage, type WorkerTabIncomingMessage } from "./worker.messages";

const MESSAGE_TYPE = WORKER_MESSAGE_TYPE;
const WORKER_BANNER_ID = "fobles-background-worker-banner";
const WORKER_ID_QUERY_PARAMETER = "foblesWorker";
const READY_TIMEOUT_MS = 20000;
const READY_POLL_INTERVAL_MS = 100;
const activeTaskControllers = new Map<string, AbortController>();

function taskKey(requestId: string, taskId: string): string { return `${requestId}:${taskId}`; }
function readIframeWorkerId(): string | undefined {
  const workerId = new URL(window.location.href).searchParams.get(WORKER_ID_QUERY_PARAMETER);
  return window.top !== window && workerId ? workerId : undefined;
}

export type ExecuteWorkerTask = (doc: Document, task: WorkerTask, signal: AbortSignal) => Promise<WorkerTaskExecutionResult>;
export type IsWorkerDocumentReady = (doc: Document) => boolean;

export function registerWorkerTabHandler(executeWorkerTask: ExecuteWorkerTask, isWorkerDocumentReady: IsWorkerDocumentReady): void {
  const iframeWorkerId = readIframeWorkerId();
  const isTopLevel = window.top === window;
  if (!isTopLevel && !iframeWorkerId) return;

  chrome.runtime.onMessage.addListener((message: WorkerTabIncomingMessage, _sender, sendResponse) => {
    let keepMessageChannelOpen = false;
    if (message.type === MESSAGE_TYPE.WORKER_SET_OWNED) addWorkerBanner(document);
    else if (message.type === MESSAGE_TYPE.WORKER_TASK_CANCEL) activeTaskControllers.get(taskKey(message.requestId, message.taskId))?.abort();
    else if (message.type === MESSAGE_TYPE.WORKER_TASK_EXECUTE) {
      const { task } = message;
      const controller = new AbortController();
      activeTaskControllers.set(taskKey(task.requestId, task.taskId), controller);
      void executeWorkerTask(document, task, controller.signal)
        .then(sendResponse)
        .catch((error: unknown) => { extensionLog.error("Worker task failed", { task, error }); sendResponse(undefined); })
        .finally(() => { activeTaskControllers.delete(taskKey(task.requestId, task.taskId)); });
      keepMessageChannelOpen = true;
    }
    return keepMessageChannelOpen;
  });

  if (iframeWorkerId) void announceIframeReadyWhenStable(iframeWorkerId, isWorkerDocumentReady);
  else void chrome.runtime.sendMessage({ type: MESSAGE_TYPE.WORKER_READY } satisfies WorkerReadyMessage);
}

async function announceIframeReadyWhenStable(workerId: string, isWorkerDocumentReady: IsWorkerDocumentReady): Promise<void> {
  const startedAt = performance.now();
  while (performance.now() - startedAt < READY_TIMEOUT_MS) {
    if (document.readyState !== "loading" && isWorkerDocumentReady(document)) {
      extensionLog.debug("Worker transport: Sitecore item document ready", { workerId, elapsedMs: Math.round(performance.now() - startedAt) });
      await chrome.runtime.sendMessage({ type: WORKER_IFRAME_READY_MESSAGE_TYPE, workerId } satisfies WorkerIframeReadyMessage);
      return;
    }
    await delay(READY_POLL_INTERVAL_MS);
  }
  extensionLog.error("Worker transport: Sitecore item document readiness timed out", { workerId, elapsedMs: Math.round(performance.now() - startedAt), readyState: document.readyState });
}

function addWorkerBanner(doc: Document): void {
  doc.getElementById(WORKER_BANNER_ID)?.remove();
  const overlay = doc.createElement("div");
  overlay.id = WORKER_BANNER_ID;
  overlay.style.cssText = ["position:fixed", "inset:0", "z-index:2147483647", "display:flex", "align-items:center", "justify-content:center", "padding:40px", "box-sizing:border-box", "background:rgba(32,48,71,0.72)", "pointer-events:none"].join(";");
  const panel = doc.createElement("div");
  panel.style.cssText = ["position:relative", "width:min(720px,85vw)", "padding:36px 48px", "box-sizing:border-box", "border:2px solid #2f6fed", "border-radius:8px", "background:rgba(255,255,255,0.96)", "box-shadow:0 12px 40px rgba(0,0,0,0.35)", "color:#203047", "font-family:Arial,sans-serif", "text-align:center", "pointer-events:none"].join(";");
  const heading = doc.createElement("div");
  heading.textContent = "Fobles Background Worker";
  heading.style.cssText = ["font-size:28px", "font-weight:700", "margin-bottom:16px"].join(";");
  const message = doc.createElement("div");
  message.textContent = "This page is temporarily being used by Fobles for background processing.";
  message.style.cssText = ["font-size:18px", "line-height:1.5"].join(";");
  const adoptButton = doc.createElement("button");
  adoptButton.type = "button";
  adoptButton.textContent = "Use this tab instead";
  adoptButton.title = "Remove this tab from the Fobles worker pool";
  adoptButton.style.cssText = ["margin-top:24px", "padding:9px 18px", "border:1px solid #2f6fed", "border-radius:4px", "background:#2f6fed", "color:#ffffff", "font:600 14px Arial,sans-serif", "cursor:pointer", "pointer-events:auto"].join(";");
  adoptButton.addEventListener("click", (event) => { event.preventDefault(); event.stopPropagation(); overlay.remove(); void chrome.runtime.sendMessage({ type: MESSAGE_TYPE.WORKER_ADOPTED } satisfies WorkerAdoptedMessage); });
  panel.append(heading, message, adoptButton);
  overlay.appendChild(panel);
  doc.documentElement.appendChild(overlay);
}

async function delay(delayMs: number): Promise<void> { await new Promise<void>((resolve) => setTimeout(resolve, delayMs)); }
