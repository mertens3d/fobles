// @source-path [fobles] src/content/sitecore-harvester/coordinator/harvest-plan-executor.ts

import { extensionLog } from "../../logger";
import { initializeRuntimeSettings, isRuntimeFaultEnabled, RUNTIME_FAULT } from "../../runtime-settings/runtime-settings";
import { HARVEST_STEP_BY_TASK_TYPE } from "../planner/harvest-steps";
import type { HarvestProgressCallback, HarvestRequest, ProgressStep } from "../sitecore-harvester.types";
import { cancelWorkerTask, runWorkerTask } from "../../foundation/workers/pool/worker-pool-client";
import { createErrorResult, type WorkerTask, type WorkerTaskResult, type WorkerTaskType } from "../../foundation/workers/tasks/worker-task.types";
import { createSetRawValuesTask, createSetStandardFieldsTask, planCollectorTaskGroups, planCollectorTasks, requestedLocatorFromUrl } from "../planner/harvest-task-planner";
import { factNameForTaskType, getFact } from "../../sitecore-data/sitecore-data-service";
import { resolveSitecoreDataIdentity } from "../../sitecore-data/sitecore-data-identity";
import type { SitecoreDataCacheKey } from "../../sitecore-data-cache/sitecore-data-cache.types";

const TASK_TIMEOUT_MS = 30000;

function stepForTaskType(type: WorkerTaskType): ProgressStep | undefined {
  return HARVEST_STEP_BY_TASK_TYPE.get(type);
}

// One harvest always targets exactly one root item, so every cacheable task it dispatches shares
// this same identity - undefined only when the request's url carries no resolvable item at all
// (collector tasks never run without a resolved root item anyway).
function resolveHarvestCacheKey(request: HarvestRequest): SitecoreDataCacheKey | undefined {
  const item = requestedLocatorFromUrl(request.url);
  return item ? { ...resolveSitecoreDataIdentity(), item } : undefined;
}

// Re-wraps a resolved fact's value as a WorkerTaskResult so every existing downstream consumer
// (mergeCollectorResult, extractRootItem, throwForFailedResults/...) keeps working unchanged,
// regardless of whether the value came from cache or a live worker task.
function buildSuccessResultFromFact(task: WorkerTask, value: unknown): WorkerTaskResult {
  return {
    requestId: task.requestId,
    taskId: task.taskId,
    type: task.type,
    status: "success",
    payload: value,
  } as WorkerTaskResult;
}

async function runTaskThroughCache(
  task: WorkerTask,
  cacheKey: SitecoreDataCacheKey | undefined,
): Promise<WorkerTaskResult> {
  const factName = cacheKey ? factNameForTaskType(task.type) : undefined;
  if (!cacheKey || !factName) return runWorkerTaskWithTimeout(task);

  const outcome = await getFact(
    cacheKey,
    factName,
    () => runWorkerTaskWithTimeout(task),
    { activityId: task.taskId, requestId: task.requestId },
  );

  return outcome.outcome === "unresolved"
    ? (outcome.result as WorkerTaskResult)
    : buildSuccessResultFromFact(task, outcome.fact.value);
}

async function runWorkerTaskWithTimeout(task: WorkerTask): Promise<WorkerTaskResult> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  extensionLog.debug("Reference graph: dispatching worker task", {
    requestId: task.requestId,
    taskId: task.taskId,
    taskType: task.type,
  });

  const timeoutResult = new Promise<WorkerTaskResult>((resolve) => {
    timeoutId = setTimeout(() => {
      extensionLog.warn("Reference graph: worker task timed out", {
        requestId: task.requestId,
        taskId: task.taskId,
        taskType: task.type,
        timeoutMs: TASK_TIMEOUT_MS,
      });

      cancelWorkerTask(task.requestId, task.taskId);
      resolve(createErrorResult(task, `Worker task timed out after ${TASK_TIMEOUT_MS}ms`));
    }, TASK_TIMEOUT_MS);
  });

  const workerResult = runWorkerTask(task).then(
    (response): WorkerTaskResult => {
      const result = response ?? createErrorResult(task, "No response from worker pool");

      extensionLog.debug(
        `Reference graph: worker task returned` +
        ` taskId=${task.taskId}` +
        ` taskType=${task.type}` +
        ` status=${result.status}` +
        ` resultType=${result.type}` +
        ` returnedValue=${result.status === "success" && (result.type === "set-raw-values" || result.type === "set-standard-fields")
          ? String(result.payload.value)
          : "undefined"
        }` +
        ` errorMessage=${result.status === "error" ? result.errorMessage : "undefined"}`,
      );

      return result;
    },
    (error: unknown): WorkerTaskResult => {
      extensionLog.warn("Reference graph: worker task rejected", {
        requestId: task.requestId,
        taskId: task.taskId,
        taskType: task.type,
        error,
      });

      return createErrorResult(
        task,
        error instanceof Error ? error.message : "Worker task rejected",
      );
    },
  );

  try {
    return await Promise.race([workerResult, timeoutResult]);
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
  }
}



function throwForCancelledResults(results: readonly WorkerTaskResult[]): void {
  const cancellations = results.filter((result) => result.status === "cancelled");

  if (cancellations.length > 0) {
    throw new DOMException(
      `Harvest cancelled while executing: ${cancellations.map((result) => result.type).join(", ")}`,
      "AbortError",
    );
  }
}

function throwForFailedResults(results: readonly WorkerTaskResult[]): void {
  const failures = results.filter((result) => result.status === "error");
  if (failures.length > 0) {
    throw new Error(failures.map((result) => `${result.type}: ${result.errorMessage}`).join("; "));
  }
}

async function dispatchTasks(
  tasks: readonly WorkerTask[],
  onProgress: HarvestProgressCallback | undefined,
  cacheKey: SitecoreDataCacheKey | undefined,
): Promise<WorkerTaskResult[]> {
  const results = await Promise.all(
    tasks.map(async (task): Promise<WorkerTaskResult> => {
      const step = stepForTaskType(task.type);
      if (step) onProgress?.(step, "active");

      const result = await runTaskThroughCache(task, cacheKey);

      if (result.status === "cancelled") {
        throw new DOMException(
          `Harvest cancelled while executing: ${result.type}`,
          "AbortError",
        );
      }

      if (result.status === "error") {
        extensionLog.warn("Reference graph: collector task failed", { task, result });
      }

      if (step) onProgress?.(step, result.status === "success" ? "complete" : "skipped");
      return result;
    }),
  );

  throwForFailedResults(results);
  return results;
}

async function restoreOriginalState(request: HarvestRequest): Promise<void> {
  const original = request.session?.originalEditorState;
  if (!original) return;

  await initializeRuntimeSettings();

  if (isRuntimeFaultEnabled(RUNTIME_FAULT.REFERENCE_GRAPH_RESTORE_EDITOR_STATE)) {
    throw new Error("Injected Reference Graph editor-state restoration failure");
  }

  const maximumAttempts = 3;
  let restorationError: unknown;

  for (let attempt = 1; attempt <= maximumAttempts; attempt += 1) {
    const restorationRequest: HarvestRequest = {
      ...request,
      requestId: crypto.randomUUID(),
    };

    extensionLog.debug("Reference graph: restoring editor state with cleanup request", {
      cancelledRequestId: request.requestId,
      restorationRequestId: restorationRequest.requestId,
      attempt,
      maximumAttempts,
      rawValues: original.rawValues,
      standardFields: original.standardFields,
    });

    try {
      await setAndVerifyEditorState(
        restorationRequest,
        original.rawValues,
        original.standardFields,
        "restore-original-state",
      );

      extensionLog.debug("Reference graph: original editor state restored", {
        cancelledRequestId: request.requestId,
        restorationRequestId: restorationRequest.requestId,
        attempt,
        rawValues: original.rawValues,
        standardFields: original.standardFields,
      });

      restorationError = undefined;
      break;
    } catch (error) {
      restorationError = error;

      const cancelled =
        error instanceof DOMException &&
        error.name === "AbortError";

      if (!cancelled || attempt === maximumAttempts) break;

      extensionLog.warn(
        "Reference graph: restoration task was cancelled; retrying with a fresh request",
        {
          cancelledRequestId: request.requestId,
          restorationRequestId: restorationRequest.requestId,
          attempt,
          maximumAttempts,
          error,
        },
      );

      await new Promise<void>((resolve) => {
        setTimeout(resolve, 0);
      });
    }
  }

  if (restorationError !== undefined) throw restorationError;
}




export async function executeHarvestPlan(
  request: HarvestRequest,
  onProgress: HarvestProgressCallback | undefined,
): Promise<WorkerTaskResult[]> {
  extensionLog.debug(`[${request.requestId}]: starting harvest plan execution`);

  const cacheKey = resolveHarvestCacheKey(request);

  if (!request.session) return await dispatchTasks(planCollectorTasks(request), onProgress, cacheKey);

  const { normalTasks, layoutTasks } = planCollectorTaskGroups(request);

  extensionLog.debug("Reference graph: executing harvest plan", {
    requestId: request.requestId,
    originalEditorState: request.session.originalEditorState,
    normalTaskCount: normalTasks.length,
    layoutTaskCount: layoutTasks.length,
  });

  try {
    await setAndVerifyEditorState(request, false, request.filters.standardFields, "normal-harvest");
    const normalResults = await dispatchTasks(normalTasks, onProgress, cacheKey);

    // Layout's own Renderings/Final Renderings fields only render in the DOM at all when
    // Standard Fields is on, regardless of whether the user wants the Standard Fields crop -
    // always required here, unlike the generic section/field harvest above.
    await setAndVerifyEditorState(request, true, true, "layout-harvest");
    const layoutResults = await dispatchTasks(layoutTasks, onProgress, cacheKey);

    return [...normalResults, ...layoutResults];
  } finally {
    try {
      await restoreOriginalState(request);
    } catch (restoreError) {
      extensionLog.error("Reference graph: restoration verification failed", {
        requestId: request.requestId,
        restoreError,
      });

      throw new Error("Something has gone wrong. Sitecore may no longer be in its original Raw Values / Standard Fields state.");
    }
  }
}

async function setAndVerifyEditorState(
  request: HarvestRequest,
  rawValues: boolean | undefined,
  standardFields: boolean | undefined,
  phase: string,
): Promise<void> {
  if (rawValues !== undefined) {
    await setAndVerifyOneEditorValue(request, createSetRawValuesTask(request, rawValues), rawValues, "rawValues", phase);
  }

  if (standardFields !== undefined) {
    await setAndVerifyOneEditorValue(request, createSetStandardFieldsTask(request, standardFields), standardFields, "standardFields", phase);
  }
}

async function setAndVerifyOneEditorValue(
  request: HarvestRequest,
  task: WorkerTask,
  requestedValue: boolean,
  label: "rawValues" | "standardFields",
  phase: string,
): Promise<void> {
  extensionLog.debug("Reference graph: establishing editor state", {
    requestId: request.requestId,
    taskId: task.taskId,
    phase,
    label,
    requestedValue,
  });

  const result = await runWorkerTaskWithTimeout(task);

  const returnedValue =
    result.status === "success" && (result.type === "set-raw-values" || result.type === "set-standard-fields")
      ? result.payload.value
      : undefined;

  extensionLog.debug(
    `Reference graph: editor-state task result` +
    ` requestId=${request.requestId}` +
    ` taskId=${task.taskId}` +
    ` phase=${phase}` +
    ` label=${label}` +
    ` requestedValue=${String(requestedValue)}` +
    ` resultStatus=${result.status}` +
    ` resultType=${result.type}` +
    ` returnedValue=${String(returnedValue)}` +
    ` errorMessage=${result.status === "error" ? result.errorMessage : "undefined"}`,
  );

  throwForCancelledResults([result]);
  throwForFailedResults([result]);

  const verified = returnedValue === requestedValue;

  if (!verified) {
    extensionLog.error(
      `Reference graph: editor-state result mismatch` +
      ` requestId=${request.requestId}` +
      ` taskId=${task.taskId}` +
      ` phase=${phase}` +
      ` label=${label}` +
      ` requestedValue=${String(requestedValue)}` +
      ` resultStatus=${result.status}` +
      ` resultType=${result.type}` +
      ` returnedValue=${String(returnedValue)}`,
    );

    throw new Error(
      `Editor-state verification failed during ${phase} (${label}): ` +
      `requested=${String(requestedValue)}, returned=${String(returnedValue)}; ` +
      `status=${result.status}, type=${result.type}`,
    );
  }

  extensionLog.debug("Reference graph: editor state established", {
    requestId: request.requestId,
    taskId: task.taskId,
    phase,
    label,
    requestedValue,
  });
}