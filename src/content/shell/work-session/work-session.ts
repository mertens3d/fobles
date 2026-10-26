// @source-path [fobles] src/content/shell/work-session/work-session.ts
import { showFoblesErrorDialog, updateFoblesCleanupDialog } from "../../../shared/error-dialog";
import { extensionLog } from "../../logger";
import { getRuntimeSettings } from "../../runtime-settings/runtime-settings";
import type { HealthProvider, HealthReport } from "../health/health.types";
import { emergencyCleanupWorkerIframes } from "../../foundation/workers/iframe/worker-iframe-host";
import { cancelWorkerRequest, disposeBackgroundWorkerPool, runWorkerTask } from "../../foundation/workers/pool/worker-pool-client";
import type { WorkerTask, WorkerTaskResult } from "../../foundation/workers/tasks/worker-task.types";
import type { WorkSession, WorkSessionState, WorkSessionTask } from "./work-session.types";
let activeSessionCount = 0;
let poolDisposalPromise: Promise<void> | undefined;
function runFinalWorkerIframeCleanup(sessionId: string): void {
  const cleanup = emergencyCleanupWorkerIframes(document);
  const forcedCleanupRequired = cleanup.orphanCountBefore > 0 || cleanup.trackedCountBefore > 0 || cleanup.containerFound;
  const cleanupFailed = cleanup.orphanCountAfter > 0 || cleanup.trackedCountAfter > 0 || cleanup.containerExistsAfter;
  if (!forcedCleanupRequired) return;
  extensionLog.error("Shell work session: worker iframe failsafe cleanup required", { sessionId, ...cleanup });
  showFoblesErrorDialog(document, { title: cleanupFailed ? "Fobles worker cleanup failed" : "Fobles cleanup required", messagePublicFacing: cleanupFailed ? "Fobles could not completely clean up its background worker frames. Sitecore Raw Values and Standard Fields may not have been restored. Reload the Sitecore page before running another Fobles operation." : "Fobles found and forcibly removed background workers left by an incomplete operation. Sitecore Raw Values and Standard Fields may not have been restored. Verify both settings before continuing and review the Fobles logs for details." });
}
async function releasePoolLease(sessionId: string): Promise<void> {
  activeSessionCount = Math.max(0, activeSessionCount - 1);
  extensionLog.debug("Shell work session: pool lease released", { sessionId, activeSessionCount });
  if (activeSessionCount !== 0) return;
  const initialIframeCount = document.querySelectorAll("iframe[data-worker-id]").length;
  const startedAt = performance.now();
  const timeoutMs = 10000;
  const progressTimer = setInterval(() => {
    const remaining = document.querySelectorAll("iframe[data-worker-id]").length;
    updateFoblesCleanupDialog(document, {
      removed: Math.max(0, initialIframeCount - remaining),
      total: initialIframeCount,
      remainingSeconds: Math.max(0, Math.ceil((timeoutMs - (performance.now() - startedAt)) / 1000)),
      phase: "disposing",
    });
  }, 250);
  poolDisposalPromise ??= disposeBackgroundWorkerPool().finally(() => { poolDisposalPromise = undefined; });
  try {
    await Promise.race([poolDisposalPromise, new Promise<void>((resolve) => setTimeout(resolve, timeoutMs))]);
  } finally {
    clearInterval(progressTimer);
    const remainingBeforeFailsafe = document.querySelectorAll("iframe[data-worker-id]").length;
    if (remainingBeforeFailsafe > 0) updateFoblesCleanupDialog(document, { removed: Math.max(0, initialIframeCount - remainingBeforeFailsafe), total: initialIframeCount, remainingSeconds: 0, phase: "failsafe" });
    runFinalWorkerIframeCleanup(sessionId);
    updateFoblesCleanupDialog(document, { removed: initialIframeCount, total: initialIframeCount, remainingSeconds: 0, phase: "complete" });
  }
  extensionLog.debug("Shell work session: final lease released; worker pool disposed", { sessionId });
}
export function createWorkSession(): WorkSession {
  const id = crypto.randomUUID();
  const controller = new AbortController();
  const activeTasks = new Set<Promise<unknown>>();
  const healthProviders = new Set<HealthProvider>();
  const recoveryCountByTaskId = new Map<string, number>();
  let state: WorkSessionState = "open";
  let released = false;
  let lastProgressAt = performance.now();
  let healthTimer: ReturnType<typeof setInterval> | undefined;
  activeSessionCount += 1;
  const health = getRuntimeSettings().workerPool;
  extensionLog.debug("Shell work session: opened", { sessionId: id, activeSessionCount });
  function markProgress(reason: string): void { lastProgressAt = performance.now(); extensionLog.debug("Shell health: progress", { sessionId: id, owner: "WorkSession", reason, activeTaskCount: activeTasks.size }); }
  function getHealth(): HealthReport {
    const checkedAt = performance.now();
    const children: HealthReport[] = Array.from(healthProviders, (provider) => provider.getHealth());
    const unhealthyChild = children.find((child) => child.state === "unhealthy");
    const noProgressMs = Math.round(checkedAt - lastProgressAt);
    const specialistStalled = activeTasks.size > 0 && noProgressMs >= health.specialistNoProgressMs;
    const healthState = specialistStalled || unhealthyChild
      ? "unhealthy"
      : children.some((child) => child.state === "degraded")
        ? "degraded"
        : "healthy";
    const recoveryCount = Array.from(recoveryCountByTaskId.values()).reduce<number>((sum, value) => sum + value, 0);
    return { owner: `WorkSession:${id}`, state: healthState, checkedAt, lastProgressAt, noProgressMs, reason: specialistStalled ? "Specialist made no forward progress within the configured limit" : unhealthyChild?.reason, activeCount: activeTasks.size, recoveryCount, children };
  }
  function registerHealthProvider(provider: HealthProvider): () => void { healthProviders.add(provider); markProgress("health-provider-registered"); return () => { healthProviders.delete(provider); markProgress("health-provider-released"); }; }
  function track<T>(promise: Promise<T>, taskId: string): Promise<T> { activeTasks.add(promise); markProgress(`task-started:${taskId}`); void promise.finally(() => { activeTasks.delete(promise); markProgress(`task-settled:${taskId}`); }); return promise; }
  async function runTask(task: WorkSessionTask): Promise<WorkerTaskResult | undefined> { if (state !== "open" || controller.signal.aborted) return undefined; return await track(runWorkerTask({ ...task, requestId: id } as WorkerTask), task.taskId); }
  async function settleActiveTasks(): Promise<void> { if (activeTasks.size > 0) await Promise.allSettled(Array.from(activeTasks)); }
  async function release(): Promise<void> { if (released) return; released = true; if (healthTimer !== undefined) { clearInterval(healthTimer); healthTimer = undefined; } await releasePoolLease(id); state = "released"; }
  async function complete(): Promise<void> { if (state === "released" || state === "completed") return; await settleActiveTasks(); state = "completed"; extensionLog.debug("Shell work session: work completed; resources retained until specialist close", { sessionId: id }); }
  async function cancel(): Promise<void> { if (state === "released") return; if (state !== "cancelling") { state = "cancelling"; controller.abort(); cancelWorkerRequest(id); extensionLog.debug("Shell work session: cancellation requested", { sessionId: id, activeTaskCount: activeTasks.size }); } await release(); }
  healthTimer = setInterval(() => { const report = getHealth(); extensionLog.debug("Shell health: poll", report); if (report.state === "unhealthy") { extensionLog.error("Shell health: unhealthy specialist; cancelling", report); void cancel(); } }, health.healthPollIntervalMs);
  return { id, signal: controller.signal, get state(): WorkSessionState { return state; }, getHealth, registerHealthProvider, markProgress, runTask, complete, cancel };
}
