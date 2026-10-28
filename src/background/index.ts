/// <reference types="chrome" />

import { LOGGER, MESSAGE } from "../constants/extension-const";
import { REFERENCE_GRAPH } from "../constants/graph.const";
import { extensionLog } from "../content/logger";
import { clearHostWorkerIframeTargets, markWorkerIframeReady } from "../content/foundation/workers/iframe/worker-iframe-service";
import { adoptWorkerTab, cancelPoolRequest, cancelPoolTask, disposeWorkerPool, handleWorkerReady, handleWorkerTabRemoved, clearWorkerPoolForHost, runPoolTask } from "../content/foundation/workers/pool/background-worker-pool";
import { WORKER_IFRAME_READY_MESSAGE_TYPE, type PoolCancelRequestMessage, type PoolCancelTaskMessage, type PoolDisposeMessage, type PoolRunTaskMessage, type WorkerAdoptedMessage, type WorkerIframeReadyMessage, type WorkerReadyMessage } from "../content/foundation/workers/transport/worker.messages";
import { WORKER_MESSAGE_TYPE } from "../content/foundation/workers/worker-protocol.const";
import { appendPersistedLogEntry, clearPersistedLogEntries } from "../shared/logging/persisted-log-storage";
import type { PersistedLogMessage } from "../shared/persisted-log.types";

const MESSAGE_TYPE = WORKER_MESSAGE_TYPE;
const REFERENCE_GRAPH_LOCK_ACQUIRE = "FOBLES_REFERENCE_GRAPH_LOCK_ACQUIRE";
const REFERENCE_GRAPH_LOCK_RELEASE = "FOBLES_REFERENCE_GRAPH_LOCK_RELEASE";
const AUDITOR_LOCK_ACQUIRE = "FOBLES_AUDITOR_LOCK_ACQUIRE";
const AUDITOR_LOCK_RELEASE = "FOBLES_AUDITOR_LOCK_RELEASE";
type SpecialistFeature = "reference-graph" | "auditor";
type ActiveSpecialist = { feature: SpecialistFeature; hostTabId: number };
let activeSpecialist: ActiveSpecialist | undefined;

const RELAYED_COMMANDS: readonly string[] = [MESSAGE.ACTION.TOGGLE_FOBLES, MESSAGE.ACTION.TOGGLE_LBOLT];
type ReferenceGraphLockMessage = { type: "FOBLES_REFERENCE_GRAPH_LOCK_ACQUIRE" } | { type: "FOBLES_REFERENCE_GRAPH_LOCK_RELEASE" };
type AuditorLockMessage = { type: "FOBLES_AUDITOR_LOCK_ACQUIRE" } | { type: "FOBLES_AUDITOR_LOCK_RELEASE" };
type RuntimeMessage = RuntimeReloadMessage | ReferenceGraphLockMessage | AuditorLockMessage | PoolRunTaskMessage | PoolCancelRequestMessage | PoolCancelTaskMessage | PoolDisposeMessage | WorkerReadyMessage | WorkerIframeReadyMessage | WorkerAdoptedMessage | PersistedLogMessage;
interface RuntimeReloadMessage { action: string; }

function acquireSpecialist(feature: SpecialistFeature, hostTabId: number | undefined): boolean {
  const acquired = hostTabId !== undefined && (activeSpecialist === undefined || (activeSpecialist.feature === feature && activeSpecialist.hostTabId === hostTabId));
  if (acquired && hostTabId !== undefined) 
activeSpecialist = { feature, hostTabId };
  return acquired;
}

function releaseSpecialist(feature: SpecialistFeature, hostTabId: number | undefined): void {
  if (hostTabId !== undefined && activeSpecialist?.feature === feature && activeSpecialist.hostTabId === hostTabId) 
activeSpecialist = undefined;
}

chrome.commands?.onCommand?.addListener((command: string) => {
  if (RELAYED_COMMANDS.includes(command)) 
chrome.tabs?.query({ active: true, currentWindow: true }, (tabs: Array<{ id?: number }>) => {
    const activeTab = tabs[0];
    if (activeTab?.id !== undefined) 
void chrome.tabs?.sendMessage(activeTab.id, { action: command });
  });
});

chrome.tabs?.onRemoved?.addListener((tabId: number) => {
  extensionLog.debug(LOGGER.NAMESPACE, "Worker diagnostics: host tab removed", { tabId, activeSpecialist });
  clearHostWorkerIframeTargets(tabId);
  clearWorkerPoolForHost(tabId);
  handleWorkerTabRemoved(tabId);
  if (activeSpecialist?.hostTabId === tabId) 
activeSpecialist = undefined;
});

chrome.runtime.onSuspend?.addListener(() => {
  extensionLog.debug(LOGGER.NAMESPACE, "Worker diagnostics: runtime suspended");
  void disposeWorkerPool();
});

chrome.runtime.onMessage.addListener((request: RuntimeMessage, sender, sendResponse) => {
  let keepMessageChannelOpen = false;
  if ("type" in request && request.type === REFERENCE_GRAPH_LOCK_ACQUIRE) {
    sendResponse({ acquired: acquireSpecialist("reference-graph", sender.tab?.id) });
  } else if ("type" in request && request.type === REFERENCE_GRAPH_LOCK_RELEASE) {
    releaseSpecialist("reference-graph", sender.tab?.id); 
sendResponse({ released: true });
  } else if ("type" in request && request.type === AUDITOR_LOCK_ACQUIRE) {
    sendResponse({ acquired: acquireSpecialist("auditor", sender.tab?.id) });
  } else if ("type" in request && request.type === AUDITOR_LOCK_RELEASE) {
    releaseSpecialist("auditor", sender.tab?.id); 
sendResponse({ released: true });
  } else if ("type" in request && request.type === REFERENCE_GRAPH.FOBLES_PERSIST_LOG) {
    void appendPersistedLogEntry(request.entry).catch((error) => extensionLog.error(LOGGER.NAMESPACE, "Failed to persist log entry", error));
  } else if ("action" in request && request.action === MESSAGE.ACTION.RELOAD_EXTENSION) {
    void clearPersistedLogEntries().catch((error: unknown) => extensionLog.error(LOGGER.NAMESPACE, "Failed to clear persisted logs before extension reload", error)).finally(() => {
      if (sender.tab?.id !== undefined) 
void chrome.tabs?.reload?.(sender.tab.id);
      chrome.runtime?.reload?.();
    });
  } else if ("type" in request && request.type === WORKER_IFRAME_READY_MESSAGE_TYPE) {
    const hostTabId = sender.tab?.id; 
const frameId = sender.frameId;
    extensionLog.debug(LOGGER.NAMESPACE, "Worker diagnostics: iframe ready received", { workerId: request.workerId, hostTabId, frameId, senderUrl: sender.url, valid: hostTabId !== undefined && frameId !== undefined && frameId !== 0 });
    if (hostTabId !== undefined && frameId !== undefined && frameId !== 0) {
      markWorkerIframeReady(request.workerId, hostTabId, frameId);
      extensionLog.debug(LOGGER.NAMESPACE, "Worker diagnostics: iframe ready registered", { workerId: request.workerId, hostTabId, frameId });
    } else extensionLog.warn(LOGGER.NAMESPACE, "Worker diagnostics: iframe ready ignored", { workerId: request.workerId, hostTabId, frameId, senderUrl: sender.url });
  } else if ("type" in request && request.type === MESSAGE_TYPE.WORKER_READY) {
    extensionLog.debug(LOGGER.NAMESPACE, "Worker diagnostics: worker ready received", { tabId: sender.tab?.id, frameId: sender.frameId, senderUrl: sender.url }); 
handleWorkerReady(sender.tab?.id);
  } else if ("type" in request && request.type === MESSAGE_TYPE.WORKER_ADOPTED) {
    extensionLog.debug(LOGGER.NAMESPACE, "Worker diagnostics: worker adopted", { tabId: sender.tab?.id, frameId: sender.frameId, senderUrl: sender.url }); 
adoptWorkerTab(sender.tab?.id);
  } else if ("type" in request && request.type === MESSAGE_TYPE.POOL_CANCEL_REQUEST) {
    extensionLog.debug(LOGGER.NAMESPACE, "Worker diagnostics: pool request cancellation received", { requestId: request.requestId, hostTabId: sender.tab?.id }); 
cancelPoolRequest(request.requestId, sender.tab?.id);
  } else if ("type" in request && request.type === MESSAGE_TYPE.POOL_CANCEL_TASK) {
    extensionLog.debug(LOGGER.NAMESPACE, "Worker diagnostics: pool task cancellation received", { requestId: request.requestId, taskId: request.taskId, hostTabId: sender.tab?.id }); 
cancelPoolTask(request.requestId, request.taskId, sender.tab?.id);
  } else if ("type" in request && request.type === MESSAGE_TYPE.POOL_DISPOSE) {
    const startedAt = performance.now();
    extensionLog.debug(LOGGER.NAMESPACE, "Worker diagnostics: pool dispose started", { hostTabId: sender.tab?.id });
    void disposeWorkerPool().then(() => {
      extensionLog.debug(LOGGER.NAMESPACE, "Worker diagnostics: pool dispose settled", { hostTabId: sender.tab?.id, elapsedMs: Math.round(performance.now() - startedAt) }); 
sendResponse(undefined);
    }).catch((error: unknown) => { extensionLog.error(LOGGER.NAMESPACE, "Failed to dispose worker pool", error); 
sendResponse(undefined); });
    keepMessageChannelOpen = true;
  } else if ("type" in request && request.type === MESSAGE_TYPE.POOL_RUN_TASK) {
    const startedAt = performance.now(); 
const hostTabId = sender.tab?.id;
    extensionLog.debug(LOGGER.NAMESPACE, "Worker diagnostics: pool task received", { requestId: request.task.requestId, taskId: request.task.taskId, taskType: request.task.type, hostTabId, senderFrameId: sender.frameId, senderUrl: sender.url, url: request.task.url });
    void runPoolTask(request.task, hostTabId).then((result) => {
      extensionLog.debug(LOGGER.NAMESPACE, "Worker diagnostics: pool task settled", { requestId: request.task.requestId, taskId: request.task.taskId, taskType: request.task.type, hostTabId, elapsedMs: Math.round(performance.now() - startedAt), resultStatus: result?.status, resultType: result?.type });
      sendResponse(result);
      extensionLog.debug(LOGGER.NAMESPACE, "Worker diagnostics: pool response sent", { requestId: request.task.requestId, taskId: request.task.taskId, taskType: request.task.type, hostTabId, elapsedMs: Math.round(performance.now() - startedAt) });
    }).catch((error: unknown) => { extensionLog.error(LOGGER.NAMESPACE, "Worker pool task failed", { requestId: request.task.requestId, taskId: request.task.taskId, taskType: request.task.type, hostTabId, elapsedMs: Math.round(performance.now() - startedAt), error }); 
sendResponse(undefined); });
    keepMessageChannelOpen = true;
  }
  return keepMessageChannelOpen;
});

extensionLog.debug(LOGGER.NAMESPACE, "Background script loaded");
