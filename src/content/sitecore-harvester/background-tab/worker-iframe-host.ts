// @source-path [fobles] src/content/sitecore-harvester/background-tab/worker-iframe-host.ts

import { CONST } from "../../../constants/const";
import { getRuntimeSettings, initializeRuntimeSettings } from "../../runtime-settings/runtime-settings";
import {
  WORKER_IFRAME_CREATE_MESSAGE_TYPE,
  WORKER_IFRAME_NAVIGATE_MESSAGE_TYPE,
  WORKER_IFRAME_REMOVE_ALL_MESSAGE_TYPE,
  WORKER_IFRAME_REMOVE_MESSAGE_TYPE,
  type WorkerIframeCreateResult,
  type WorkerIframeHostMessage,
} from "../worker-pool/worker.messages";

const workerIframeById = new Map<string, HTMLIFrameElement>();
let workerIframeHostRegistered = false;

export function registerWorkerIframeHost(doc: Document): void {
  if (workerIframeHostRegistered) return;
  workerIframeHostRegistered = true;

  chrome.runtime.onMessage.addListener(
    (message: WorkerIframeHostMessage, _sender, sendResponse) => {
      if (message.type === WORKER_IFRAME_CREATE_MESSAGE_TYPE) {
        void createWorkerIframe(doc, message.url).then(sendResponse);
        return true;
      }

      if (message.type === WORKER_IFRAME_NAVIGATE_MESSAGE_TYPE) {
        sendResponse(navigateWorkerIframe(message.workerId, message.url));
      } else if (message.type === WORKER_IFRAME_REMOVE_MESSAGE_TYPE) {
        sendResponse(removeWorkerIframe(message.workerId));
      } else if (message.type === WORKER_IFRAME_REMOVE_ALL_MESSAGE_TYPE) {
        removeAllWorkerIframes(doc);
        sendResponse(true);
      }

      return false;
    },
  );
}

export async function createWorkerIframe(
  doc: Document,
  url: string,
): Promise<WorkerIframeCreateResult> {
  await initializeRuntimeSettings();

  const workerId = crypto.randomUUID();
  const iframe = doc.createElement("iframe");

  iframe.dataset.workerId = workerId;
  iframe.src = createWorkerUrl(url, workerId);

  applyWorkerIframeStyle(iframe, workerIframeById.size);
  getWorkerIframeContainer(doc).appendChild(iframe);
  workerIframeById.set(workerId, iframe);

  return { workerId };
}

function createWorkerIframeContainer(doc: Document): HTMLDivElement {
  const container = doc.createElement("div");
  const hideWorkerIframes = getRuntimeSettings().workerPool.hideWorkerIframes;

  container.id = CONST.FOBLES.WORKER_POOL.WORKER_IFRAME_CONTAINER_ID;
  container.style.cssText = hideWorkerIframes
    ? ["position:fixed", "left:-10000px", "top:-10000px", "width:1px", "height:1px", "overflow:hidden", "z-index:-1"].join(";")
    : [
        "position:fixed",
        "right:20px",
        "bottom:20px",
        "z-index:2147483646",
        "display:flex",
        "flex-direction:column",
        "gap:8px",
        "max-height:calc(100vh - 40px)",
        "overflow:auto",
        "padding:8px",
        "border:2px solid #2f6fed",
        "background:#ffffff",
        "box-shadow:0 10px 30px rgba(0,0,0,0.3)",
      ].join(";");

  doc.body.appendChild(container);
  return container;
}

function applyWorkerIframeStyle(iframe: HTMLIFrameElement, index: number): void {
  const hideWorkerIframes = getRuntimeSettings().workerPool.hideWorkerIframes;

  iframe.title = `Fobles worker iframe ${index + 1}`;
  iframe.style.cssText = hideWorkerIframes
    ? ["display:block", "width:1px", "height:1px", "border:0"].join(";")
    : ["display:block", "width:700px", "height:500px", "border:1px solid #7f9bc4", "background:#ffffff"].join(";");
}

export function navigateWorkerIframe(workerId: string, url: string): boolean {
  const iframe = workerIframeById.get(workerId);
  let navigated = false;

  if (iframe) {
    iframe.src = createWorkerUrl(url, workerId);
    navigated = true;
  }

  return navigated;
}

export function removeWorkerIframe(workerId: string): boolean {
  const iframe = workerIframeById.get(workerId);
  let removed = false;

  if (iframe) {
    iframe.remove();
    workerIframeById.delete(workerId);
    removed = true;
    removeEmptyContainer();
  }

  return removed;
}

export function removeAllWorkerIframes(doc: Document): void {
  workerIframeById.forEach((iframe) => iframe.remove());
  workerIframeById.clear();
  doc.getElementById(CONST.FOBLES.WORKER_POOL.WORKER_IFRAME_CONTAINER_ID)?.remove();
}

function createWorkerUrl(url: string, workerId: string): string {
  const workerUrl = new URL(url);
  workerUrl.searchParams.set(CONST.FOBLES.WORKER_POOL.WORKER_ID_QUERY_PARAMETER, workerId);
  return workerUrl.toString();
}

function getWorkerIframeContainer(doc: Document): HTMLDivElement {
  const existingContainer = doc.getElementById(CONST.FOBLES.WORKER_POOL.WORKER_IFRAME_CONTAINER_ID);
  let container: HTMLDivElement;

  if (existingContainer instanceof HTMLDivElement) {
    container = existingContainer;
  } else {
    container = createWorkerIframeContainer(doc);
  }

  return container;
}


function removeEmptyContainer(): void {
  if (workerIframeById.size === 0) {
    document.getElementById(CONST.FOBLES.WORKER_POOL.WORKER_IFRAME_CONTAINER_ID)?.remove();
  }
}

