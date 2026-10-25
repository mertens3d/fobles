/// <reference types="chrome" />

import { CONST } from "../constants/const";
import { extensionLog } from "./logger";
import { receiveActivityMessage } from "./shared/activity/activity-events";
import { startFoblesShellRuntime } from "./shell/shell-runtime";
import { buildItemGraphNodeDataFromDoc } from "./foundation/harvesting/enrichment/item-enricher";
import { executeWorkerTask } from "./foundation/harvesting/worker-task-executor";
import { registerWorkerTabHandler } from "./foundation/workers/transport/worker-tab-handler";
import { startToolbarRuntime } from "./toolbar-runtime";

function getWorkerId(): string | null {
  return new URLSearchParams(window.location.search).get(CONST.FOBLES.WORKER_POOL.WORKER_ID_QUERY_PARAMETER);
}

function isSitecoreItemDocumentReady(doc: Document): boolean {
  const item = buildItemGraphNodeDataFromDoc(doc);
  return Boolean(item.scItemId || item.scItemPath);
}

function startWorkerRuntime(workerId: string): void {
  extensionLog.debug("Content runtime: starting worker mode", { workerId });
  registerWorkerTabHandler(executeWorkerTask, isSitecoreItemDocumentReady);
}

function startNormalRuntime(): void {
  extensionLog.info("Content script loaded. Press Ctrl+Shift+E to toggle.");
  chrome.runtime.onMessage.addListener((message: unknown) => { receiveActivityMessage(message); });
  registerWorkerTabHandler(executeWorkerTask, isSitecoreItemDocumentReady);
  startFoblesShellRuntime(document, window);
  startToolbarRuntime();
}

const workerId = getWorkerId();
if (workerId) startWorkerRuntime(workerId);
else startNormalRuntime();
