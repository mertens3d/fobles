/// <reference types="chrome" />

import { CONST } from "../constants/const";
import { extensionLog } from "./logger";
import { startItemHistoryManager } from "./item-history/item-history-manager";
import { receiveActivityMessage } from "./shared/activity/activity-events";
import { startFoblesShellRuntime } from "./shell/shell-runtime";
import { buildItemGraphNodeDataFromDoc } from "./foundation/harvesting/enrichment/item-enricher";
import { executeWorkerTask } from "./foundation/harvesting/worker-task-executor";
import { registerWorkerTabHandler } from "./foundation/workers/transport/worker-tab-handler";
import { startToolbarRuntime } from "./toolbar-runtime";
import { startBrowserNavigation } from "./foundation/sitecore/browser-navigation";
import { getBrowserNavigationHistoryEnabled, onBrowserNavigationHistoryEnabledChange } from "../shared/browser-navigation-settings";

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

let stopBrowserNavigation: (() => void) | undefined;

function applyBrowserNavigationHistory(enabled: boolean): void {
  stopBrowserNavigation?.();
  stopBrowserNavigation = enabled ? startBrowserNavigation({ doc: document, navigateToItem: () => window.location.reload() }) : undefined;
}

async function startBrowserNavigationRuntime(): Promise<void> {
  applyBrowserNavigationHistory(await getBrowserNavigationHistoryEnabled());
  onBrowserNavigationHistoryEnabledChange(applyBrowserNavigationHistory);
}

function startNormalRuntime(): void {
  extensionLog.info("Content script loaded. Press Ctrl+Shift+E to toggle.");
  chrome.runtime.onMessage.addListener((message: unknown) => {
    receiveActivityMessage(message);
  });
  registerWorkerTabHandler(executeWorkerTask, isSitecoreItemDocumentReady);
  startItemHistoryManager(document);
  startFoblesShellRuntime(document, window);
  startToolbarRuntime();
  void startBrowserNavigationRuntime();
}

const workerId = getWorkerId();
if (workerId) {
  startWorkerRuntime(workerId);
} else {
  startNormalRuntime();
}
