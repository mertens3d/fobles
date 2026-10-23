// @source-path [fobles] src/content/sitecore-harvester/coordinator/harvest-plan-executor.ts

import { extensionLog } from "../../logger";
import { initializeRuntimeSettings, isRuntimeFaultEnabled, RUNTIME_FAULT } from "../../runtime-settings/runtime-settings";
import { HARVEST_STEP_BY_TASK_TYPE } from "../harvest-steps";
import type { HarvestProgressCallback, HarvestRequest, ProgressStep } from "../sitecore-harvester.types";
import { cancelWorkerTask, runWorkerTask } from "../worker-pool/worker-pool-client";
import { createErrorResult, type WorkerTask, type WorkerTaskResult, type WorkerTaskType } from "../worker-pool/worker-task.types";
import { createEditorStateTask, planCollectorTaskGroups, planCollectorTasks } from "./harvest-task-planner";

const TASK_TIMEOUT_MS = 30000;

function stepForTaskType(type: WorkerTaskType): ProgressStep | undefined {
  return HARVEST_STEP_BY_TASK_TYPE.get(type);
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
        ` returnedRaw=${
          result.status === "success" && result.type === "set-editor-state"
            ? String(result.payload.editorState.rawValues)
            : "undefined"
        }` +
        ` returnedStandard=${
          result.status === "success" && result.type === "set-editor-state"
            ? String(result.payload.editorState.standardFields)
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
): Promise<WorkerTaskResult[]> {
  const results = await Promise.all(
    tasks.map(async (task): Promise<WorkerTaskResult> => {
      const step = stepForTaskType(task.type);
      if (step) onProgress?.(step, "active");

      const result = await runWorkerTaskWithTimeout(task);

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

  const restorationRequest: HarvestRequest = {
    ...request,
    requestId: crypto.randomUUID(),
  };

  extensionLog.debug("Reference graph: restoring editor state with cleanup request", {
    cancelledRequestId: request.requestId,
    restorationRequestId: restorationRequest.requestId,
    rawValues: original.rawValues,
    standardFields: original.standardFields,
  });

  await setAndVerifyEditorState(
    restorationRequest,
    original.rawValues,
    original.standardFields,
    "restore-original-state",
  );
}


export async function executeHarvestPlan(
  request: HarvestRequest,
  onProgress: HarvestProgressCallback | undefined,
): Promise<WorkerTaskResult[]> {
  extensionLog.debug(`[${request.requestId}]: starting harvest plan execution`);

  if (!request.session) return await dispatchTasks(planCollectorTasks(request), onProgress);

  const { normalTasks, layoutTasks } = planCollectorTaskGroups(request);
  let harvestError: unknown;

  extensionLog.debug("Reference graph: executing harvest plan", {
    requestId: request.requestId,
    originalEditorState: request.session.originalEditorState,
    normalTaskCount: normalTasks.length,
    layoutTaskCount: layoutTasks.length,
  });

  try {
    await setAndVerifyEditorState(request, false, request.filters.standardFields, "normal-harvest");
    const normalResults = await dispatchTasks(normalTasks, onProgress);

    // Layout's own Renderings/Final Renderings fields only render in the DOM at all when
    // Standard Fields is on, regardless of whether the user wants the Standard Fields crop -
    // always required here, unlike the generic section/field harvest above.
    await setAndVerifyEditorState(request, true, true, "layout-harvest");
    const layoutResults = await dispatchTasks(layoutTasks, onProgress);

    return [...normalResults, ...layoutResults];
  } catch (error) {
    harvestError = error;
    throw error;
  } finally {
    try {
      await restoreOriginalState(request);
    } catch (restoreError) {
      extensionLog.error("Reference graph: restoration verification failed", {
        requestId: request.requestId,
        restoreError,
      });

      throw new Error("Something has gone wrong. Sitecore may no longer be in its original Raw Values / Standard Fields state.",);
    }
  }
}

async function setAndVerifyEditorState(
  request: HarvestRequest,
  rawValues: boolean | undefined,
  standardFields: boolean | undefined,
  phase: string,
): Promise<void> {
  const task = createEditorStateTask(request, { rawValues, standardFields });

  extensionLog.debug("Reference graph: establishing editor state", {
    requestId: request.requestId,
    taskId: task.taskId,
    phase,
    rawValues,
    standardFields,
  });

  const result = await runWorkerTaskWithTimeout(task);

  const returnedEditorState =
    result.status === "success" && result.type === "set-editor-state"
      ? result.payload.editorState
      : undefined;

  extensionLog.debug(
    `Reference graph: editor-state task result` +
    ` requestId=${request.requestId}` +
    ` taskId=${task.taskId}` +
    ` phase=${phase}` +
    ` requestedRaw=${String(rawValues)}` +
    ` requestedStandard=${String(standardFields)}` +
    ` resultStatus=${result.status}` +
    ` resultType=${result.type}` +
    ` returnedRaw=${String(returnedEditorState?.rawValues)}` +
    ` returnedStandard=${String(returnedEditorState?.standardFields)}` +
    ` errorMessage=${result.status === "error" ? result.errorMessage : "undefined"}`,
  );

  throwForCancelledResults([result]);
  throwForFailedResults([result]);

  const verified =
    returnedEditorState?.rawValues === rawValues &&
    returnedEditorState?.standardFields === standardFields;

  if (!verified) {
    extensionLog.error(
      `Reference graph: editor-state result mismatch` +
      ` requestId=${request.requestId}` +
      ` taskId=${task.taskId}` +
      ` phase=${phase}` +
      ` requestedRaw=${String(rawValues)}` +
      ` requestedStandard=${String(standardFields)}` +
      ` resultStatus=${result.status}` +
      ` resultType=${result.type}` +
      ` returnedRaw=${String(returnedEditorState?.rawValues)}` +
      ` returnedStandard=${String(returnedEditorState?.standardFields)}`,
    );

    throw new Error(
      `Editor-state verification failed during ${phase}: ` +
      `requested Raw=${String(rawValues)}, Standard=${String(standardFields)}; ` +
      `returned Raw=${String(returnedEditorState?.rawValues)}, ` +
      `Standard=${String(returnedEditorState?.standardFields)}; ` +
      `status=${result.status}, type=${result.type}`,
    );
  }

  extensionLog.debug("Reference graph: editor state established", {
    requestId: request.requestId,
    taskId: task.taskId,
    phase,
    rawValues,
    standardFields,
  });
}