// @source-path [fobles] src/content/sitecore-harvester/background-tab/worker-tab-handler.ts

import { REFERENCE_GRAPH } from "../../../constants/graph.const";
import { extensionLog } from "../../logger";
import {
  executeWorkerTask,
} from "./worker-task-executor";
import {
  WORKER_IFRAME_READY_MESSAGE_TYPE,
  type WorkerAdoptedMessage,
  type WorkerIframeReadyMessage,
  type WorkerReadyMessage,
  type WorkerSetOwnedMessage,
  type WorkerTabIncomingMessage,
} from "../worker-pool/worker.messages";

const MESSAGE_TYPE =
  REFERENCE_GRAPH.BACKGROUND_HARVEST.MESSAGE.TYPE;

const WORKER_BANNER_ID =
  "fobles-background-worker-banner";

const WORKER_ID_QUERY_PARAMETER =
  "foblesWorker";

const activeTaskControllers =
  new Map<string, AbortController>();

function taskKey(
  requestId: string,
  taskId: string,
): string {
  return `${requestId}:${taskId}`;
}

function readIframeWorkerId():
  string | undefined {
  const workerId =
    new URL(
      window.location.href,
    ).searchParams.get(
      WORKER_ID_QUERY_PARAMETER,
    );

  let iframeWorkerId:
    | string
    | undefined = undefined;

  if (
    window.top !== window &&
    workerId
  ) {
    iframeWorkerId =
      workerId;
  }

  return iframeWorkerId;
}

export function registerWorkerTabHandler():
  void {
  const iframeWorkerId =
    readIframeWorkerId();

  const isTopLevel =
    window.top === window;

  if (
    !isTopLevel &&
    !iframeWorkerId
  ) {
    return;
  }

  chrome.runtime.onMessage.addListener(
    (
      message:
        WorkerTabIncomingMessage,
      _sender,
      sendResponse,
    ) => {
      let keepMessageChannelOpen =
        false;

      if (
        message.type ===
        MESSAGE_TYPE.WORKER_SET_OWNED
      ) {
        addWorkerBanner(document);
      } else if (
        message.type ===
        MESSAGE_TYPE.WORKER_TASK_CANCEL
      ) {
        activeTaskControllers
          .get(
            taskKey(
              message.requestId,
              message.taskId,
            ),
          )
          ?.abort();
      } else if (
        message.type ===
        MESSAGE_TYPE.WORKER_TASK_EXECUTE
      ) {
        const { task } =
          message;

        const controller =
          new AbortController();

        activeTaskControllers.set(
          taskKey(
            task.requestId,
            task.taskId,
          ),
          controller,
        );

        void executeWorkerTask(
          document,
          task,
          controller.signal,
        )
          .then(sendResponse)
          .catch(
            (error: unknown) => {
              extensionLog.error(
                "Worker task failed",
                {
                  task,
                  error,
                },
              );

              sendResponse(
                undefined,
              );
            },
          )
          .finally(() => {
            activeTaskControllers.delete(
              taskKey(
                task.requestId,
                task.taskId,
              ),
            );
          });

        keepMessageChannelOpen =
          true;
      }

      return keepMessageChannelOpen;
    },
  );

  if (iframeWorkerId) {
    void chrome.runtime.sendMessage({
      type:
        WORKER_IFRAME_READY_MESSAGE_TYPE,
      workerId:
        iframeWorkerId,
    } satisfies WorkerIframeReadyMessage);
  } else {
    void chrome.runtime.sendMessage({
      type:
        MESSAGE_TYPE.WORKER_READY,
    } satisfies WorkerReadyMessage);
  }
}

function addWorkerBanner(
  doc: Document,
): void {
  doc
    .getElementById(
      WORKER_BANNER_ID,
    )
    ?.remove();

  const overlay =
    doc.createElement("div");

  overlay.id =
    WORKER_BANNER_ID;

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

  const panel =
    doc.createElement("div");

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

  const heading =
    doc.createElement("div");

  heading.textContent =
    "Fobles Background Worker";

  heading.style.cssText = [
    "font-size:28px",
    "font-weight:700",
    "margin-bottom:16px",
  ].join(";");

  const message =
    doc.createElement("div");

  message.textContent =
    "This page is temporarily being used by Fobles for background processing.";

  message.style.cssText = [
    "font-size:18px",
    "line-height:1.5",
  ].join(";");

  const adoptButton =
    doc.createElement("button");

  adoptButton.type =
    "button";

  adoptButton.textContent =
    "Use this tab instead";

  adoptButton.title =
    "Remove this tab from the Fobles worker pool";

  adoptButton.style.cssText = [
    "margin-top:24px",
    "padding:9px 18px",
    "border:1px solid #2f6fed",
    "border-radius:4px",
    "background:#2f6fed",
    "color:#ffffff",
    "font:600 14px Arial,sans-serif",
    "cursor:pointer",
    "pointer-events:auto",
  ].join(";");

  adoptButton.addEventListener(
    "click",
    (event) => {
      event.preventDefault();
      event.stopPropagation();

      overlay.remove();

      void chrome.runtime.sendMessage({
        type:
          MESSAGE_TYPE.WORKER_ADOPTED,
      } satisfies WorkerAdoptedMessage);
    },
  );

  panel.append(
    heading,
    message,
    adoptButton,
  );

  overlay.appendChild(
    panel,
  );

  doc.documentElement.appendChild(
    overlay,
  );
}