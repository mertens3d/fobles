import { CONST } from "../../../../constants/const";
import { extensionLog } from "../../../logger";
import { getRuntimeSettings, initializeRuntimeSettings } from "../../../runtime-settings/runtime-settings";
import { logWorkerMemory, logWorkerMemoryAfterDelays } from "../diagnostics/memory-diagnostics";
import {
  WORKER_IFRAME_CREATE_MESSAGE_TYPE,
  WORKER_IFRAME_NAVIGATE_MESSAGE_TYPE,
  WORKER_IFRAME_REMOVE_ALL_MESSAGE_TYPE,
  WORKER_IFRAME_REMOVE_MESSAGE_TYPE,
  type WorkerIframeCreateResult,
  type WorkerIframeHostMessage,
} from "../transport/worker.messages";

const WORKER_POOL = CONST.FOBLES.WORKER_POOL;
const workerIframeById = new Map<string, HTMLIFrameElement>();
let workerIframeHostRegistered = false;

export function registerWorkerIframeHost(doc: Document): void {
  if (workerIframeHostRegistered) return;
  workerIframeHostRegistered = true;
  chrome.runtime.onMessage.addListener(
    (message: WorkerIframeHostMessage, _sender, sendResponse) => {
      if (message.type === WORKER_IFRAME_CREATE_MESSAGE_TYPE) {
        void createWorkerIframe(doc, message.url)
          .then(sendResponse)
          .catch((error) => {
            extensionLog.error("Worker iframe host: iframe creation failed", { error });
            sendResponse(undefined);
          });
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
  applyWorkerIframeClass(iframe, workerIframeById.size);
  getWorkerIframeContainer(doc).appendChild(iframe);
  workerIframeById.set(workerId, iframe);
  logWorkerMemory("iframe created", {
    workerId,
    trackedIframes: workerIframeById.size,
    domIframes: doc.querySelectorAll(WORKER_POOL.WORKER_IFRAME_SELECTOR).length,
  });
  return { workerId };
}

function createWorkerIframeContainer(doc: Document): HTMLDivElement {
  const container = doc.createElement("div");
  container.id = WORKER_POOL.WORKER_IFRAME_CONTAINER_ID;
  container.classList.add(WORKER_POOL.WORKER_IFRAME_CONTAINER_CLASS);
  applyWorkerIframeContainerClass(container);
  doc.body.appendChild(container);
  extensionLog.debug("Worker iframe host: container created", { containerId: container.id });
  return container;
}

function applyWorkerIframeContainerClass(container: HTMLDivElement): void {
  const hidden = getRuntimeSettings().workerPool.hideWorkerIframes;
  container.classList.toggle(WORKER_POOL.WORKER_IFRAME_CONTAINER_CLASS_HIDDEN, hidden);
  container.classList.toggle(WORKER_POOL.WORKER_IFRAME_CONTAINER_CLASS_VISIBLE, !hidden);
}

function applyWorkerIframeClass(iframe: HTMLIFrameElement, index: number): void {
  const hidden = getRuntimeSettings().workerPool.hideWorkerIframes;
  iframe.title = `Fobles worker iframe ${index + 1}`;
  iframe.classList.add(WORKER_POOL.WORKER_IFRAME_CLASS);
  iframe.classList.toggle(WORKER_POOL.WORKER_IFRAME_CLASS_HIDDEN, hidden);
  iframe.classList.toggle(WORKER_POOL.WORKER_IFRAME_CLASS_VISIBLE, !hidden);
}

function getWorkerIframeContainer(doc: Document): HTMLDivElement {
  const existingContainer = doc.getElementById(WORKER_POOL.WORKER_IFRAME_CONTAINER_ID);
  let container: HTMLDivElement;
  if (existingContainer instanceof HTMLDivElement) {
    container = existingContainer;
    applyWorkerIframeContainerClass(container);
  } else {
    container = createWorkerIframeContainer(doc);
  }
  return container;
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
    extensionLog.debug("Worker iframe host: iframe removed", {
      workerId,
      trackedIframes: workerIframeById.size,
      domIframes: document.querySelectorAll(WORKER_POOL.WORKER_IFRAME_SELECTOR).length,
    });
  } else {
    extensionLog.error("Worker iframe host: iframe not found for removal", {
      workerId,
      trackedIframes: workerIframeById.size,
      domIframes: document.querySelectorAll(WORKER_POOL.WORKER_IFRAME_SELECTOR).length,
      trackedWorkerIds: Array.from(workerIframeById.keys()),
    });
  }
  return removed;
}

export type WorkerIframeEmergencyCleanupResult = {
  containerFound: boolean;
  trackedCountBefore: number;
  orphanCountBefore: number;
  workerIds: string[];
  iframeSrcs: string[];
  orphanCountAfter: number;
  trackedCountAfter: number;
  containerExistsAfter: boolean;
};

export function emergencyCleanupWorkerIframes(doc: Document): WorkerIframeEmergencyCleanupResult {
  const containerId = WORKER_POOL.WORKER_IFRAME_CONTAINER_ID;
  const container = doc.getElementById(containerId);
  const orphanIframes = Array.from(
    doc.querySelectorAll<HTMLIFrameElement>(WORKER_POOL.WORKER_IFRAME_SELECTOR),
  );
  const result: WorkerIframeEmergencyCleanupResult = {
    containerFound: Boolean(container),
    trackedCountBefore: workerIframeById.size,
    orphanCountBefore: orphanIframes.length,
    workerIds: orphanIframes
      .map((iframe) => iframe.dataset.workerId)
      .filter((workerId): workerId is string => Boolean(workerId)),
    iframeSrcs: orphanIframes.map((iframe) => iframe.src),
    orphanCountAfter: orphanIframes.length,
    trackedCountAfter: workerIframeById.size,
    containerExistsAfter: Boolean(container),
  };
  if (result.orphanCountBefore === 0 && result.trackedCountBefore === 0) {
    return result;
  }
  extensionLog.error("Worker iframe emergency cleanup: orphaned worker iframes detected", {
    containerFound: result.containerFound,
    trackedCount: result.trackedCountBefore,
    orphanCount: result.orphanCountBefore,
    workerIds: result.workerIds,
    iframeSrcs: result.iframeSrcs,
  });
  logWorkerMemory("emergency cleanup before removal", {
    containerFound: result.containerFound,
    trackedIframes: result.trackedCountBefore,
    domIframes: result.orphanCountBefore,
    workerIds: result.workerIds,
  });
  container?.remove();
  orphanIframes.forEach((iframe) => {
    if (iframe.isConnected) iframe.remove();
  });
  workerIframeById.clear();
  result.orphanCountAfter = doc.querySelectorAll(WORKER_POOL.WORKER_IFRAME_SELECTOR).length;
  result.trackedCountAfter = workerIframeById.size;
  result.containerExistsAfter = doc.getElementById(containerId) !== null;
  extensionLog.error("Worker iframe emergency cleanup: forced cleanup complete", {
    orphanCountBefore: result.orphanCountBefore,
    orphanCountAfter: result.orphanCountAfter,
    trackedCountBefore: result.trackedCountBefore,
    trackedCountAfter: result.trackedCountAfter,
    containerExistsAfter: result.containerExistsAfter,
  });
  logWorkerMemoryAfterDelays("emergency cleanup after removal", {
    orphanCountBefore: result.orphanCountBefore,
    orphanCountAfter: result.orphanCountAfter,
    trackedIframes: result.trackedCountAfter,
    containerExistsAfter: result.containerExistsAfter,
  });
  return result;
}

export function removeAllWorkerIframes(doc: Document): void {
  workerIframeById.forEach((iframe) => iframe.remove());
  workerIframeById.clear();
  doc.getElementById(WORKER_POOL.WORKER_IFRAME_CONTAINER_ID)?.remove();
}

function createWorkerUrl(url: string, workerId: string): string {
  const workerUrl = new URL(url);
  workerUrl.searchParams.set(WORKER_POOL.WORKER_ID_QUERY_PARAMETER, workerId);
  return workerUrl.toString();
}

function removeEmptyContainer(): void {
  if (workerIframeById.size === 0) {
    document.getElementById(WORKER_POOL.WORKER_IFRAME_CONTAINER_ID)?.remove();
  }
}
