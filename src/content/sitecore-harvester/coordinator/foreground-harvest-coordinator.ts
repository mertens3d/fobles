// @source-path [fobles] src/content/sitecore-harvester/coordinator/foreground-harvest-coordinator.ts

import { extensionLog } from "../../logger";
import { HARVEST_STEPS } from "../harvest-steps";
import type {
  HarvestProgressCallback,
  HarvestRequest,
  ProgressStep,
  SitecoreHarvestResult,
} from "../sitecore-harvester.types";
import {
  cancelWorkerRequest,
  cancelWorkerTask,
  runWorkerTask,
} from "../worker-pool/worker-pool-client";
import {
  createErrorResult,
  isSuccessResult,
  type WorkerTask,
  type WorkerTaskResult,
  type WorkerTaskType,
} from "../worker-pool/worker-task.types";
import {
  createBaseResult,
  extractRootItem,
  mergeCollectorResult,
} from "./harvest-result-merger";
import {
  createEditorStateTask,
  FILTER_KEY_BY_COLLECTOR_TASK_TYPE,
  planCollectorTaskGroups,
  planCollectorTasks,
} from "./harvest-task-planner";

type HarvestOptions = {
  onProgress?: HarvestProgressCallback;
  signal?: AbortSignal;
};

const TASK_TIMEOUT_MS = 30000;

const HARVEST_STEP_BY_FILTER_KEY = new Map(
  HARVEST_STEPS.map((step) => [step.filterKey, step] as const),
);

function stepForTaskType(
  type: WorkerTaskType,
): ProgressStep | undefined {
  const filterKey = FILTER_KEY_BY_COLLECTOR_TASK_TYPE.get(type);
  return filterKey ? HARVEST_STEP_BY_FILTER_KEY.get(filterKey) : undefined;
}

function reportSkippedSteps(
  request: HarvestRequest,
  onProgress: HarvestProgressCallback | undefined,
): void {
  for (const step of HARVEST_STEPS) {
    if (!request.filters[step.filterKey]) {
      onProgress?.(step, "skipped");
    }
  }
}

async function runWorkerTaskWithTimeout(
  task: WorkerTask,
): Promise<WorkerTaskResult> {
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

      resolve(
        createErrorResult(
          task,
          `Worker task timed out after ${TASK_TIMEOUT_MS}ms`,
        ),
      );
    }, TASK_TIMEOUT_MS);
  });

  const workerResult = runWorkerTask(task).then(
    (response): WorkerTaskResult => {
      const result =
        response ??
        createErrorResult(task, "No response from worker pool");

      extensionLog.debug("Reference graph: worker task returned", {
        requestId: task.requestId,
        taskId: task.taskId,
        taskType: task.type,
        status: result.status,
      });

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
        error instanceof Error
          ? error.message
          : "Worker task rejected",
      );
    },
  );

  let result: WorkerTaskResult;

  try {
    result = await Promise.race([
      workerResult,
      timeoutResult,
    ]);
  } finally {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
  }

  return result;
}

async function dispatchTasks(
  tasks: readonly WorkerTask[],
  onProgress: HarvestProgressCallback | undefined,
): Promise<WorkerTaskResult[]> {
  return await Promise.all(
    tasks.map(async (task): Promise<WorkerTaskResult> => {
      const step = stepForTaskType(task.type);

      if (step) {
        onProgress?.(step, "active");
      }

      const result = await runWorkerTaskWithTimeout(task);

      if (result.status === "error") {
        extensionLog.warn("Reference graph: collector task failed", {
          task,
          result,
        });
      }

      if (step) {
        onProgress?.(
          step,
          result.status === "success"
            ? "complete"
            : "skipped",
        );
      }

      return result;
    }),
  );
}
function throwForFailedResults(results: readonly WorkerTaskResult[]): void {
  const failedResults = results.filter((result) => result.status === "error");

  if (failedResults.length > 0) {
    throw new Error(
      failedResults
        .map((result) => `${result.type}: ${result.errorMessage}`)
        .join("; "),
    );
  }
}

async function setEditorState(
  request: HarvestRequest,
  rawValues: boolean | undefined,
  standardFields: boolean | undefined,
): Promise<void> {
  const task = createEditorStateTask(request, { rawValues, standardFields });

  extensionLog.debug("Reference graph: requesting editor state", {
    requestId: request.requestId,
    taskId: task.taskId,
    rawValues,
    standardFields,
  });

  const result = await runWorkerTaskWithTimeout(task);

  extensionLog.debug("Reference graph: editor-state task returned", {
    requestId: request.requestId,
    taskId: task.taskId,
    requestedRawValues: rawValues,
    requestedStandardFields: standardFields,
    status: result.status,
    payload: result.status === "success" && result.type === "set-editor-state"
      ? result.payload.editorState
      : undefined,
  });

  throwForFailedResults([result]);

  if (result.status !== "success") {
    throw new Error(`set-editor-state: ${result.status}`);
  }

  if (
    result.type !== "set-editor-state" ||
    result.payload.editorState.rawValues !== rawValues ||
    result.payload.editorState.standardFields !== standardFields
  ) {
    throw new Error(
      `Editor-state verification failed: requested Raw=${String(rawValues)}, Standard=${String(standardFields)}`,
    );
  }
}

async function dispatchSessionTasks(
  request: HarvestRequest,
  onProgress: HarvestProgressCallback | undefined,
): Promise<WorkerTaskResult[]> {
  if (!request.session) {
    return await dispatchTasks(planCollectorTasks(request), onProgress);
  }

  const { normalTasks, layoutTasks } = planCollectorTaskGroups(request);
  const collectorResults: WorkerTaskResult[] = [];

  if (normalTasks.length > 0) {
    await setEditorState(request, false, true);
    collectorResults.push(...await dispatchTasks(normalTasks, onProgress));
  }

  if (layoutTasks.length > 0) {
    await setEditorState(request, true, true);
    collectorResults.push(...await dispatchTasks(layoutTasks, onProgress));
  }

  return collectorResults;
}

export async function harvestSitecoreWithWorkers(
  request: HarvestRequest,
  options: HarvestOptions = {},
): Promise<SitecoreHarvestResult | undefined> {
  const { onProgress, signal } = options;

  const abortListener = (): void => {
    cancelWorkerRequest(request.requestId);
  };

  signal?.addEventListener("abort", abortListener);

  onProgress?.({ stepKey: "fetch-document", label: "Fetching Document" }, "active");
  onProgress?.({ stepKey: "parse-document", label: "Parsing Document" }, "active");
  reportSkippedSteps(request, onProgress);

  let result: SitecoreHarvestResult | undefined;
  let harvestError: unknown;

  try {
    const collectorResults = await dispatchSessionTasks(request, onProgress);
    throwForFailedResults(collectorResults);

    onProgress?.({ stepKey: "fetch-document", label: "Fetching Document" }, "complete");
    onProgress?.({ stepKey: "parse-document", label: "Parsing Document" }, "complete");

    if (!signal?.aborted) {
      const successfulResults = collectorResults.filter(isSuccessResult);
      const rootItem = extractRootItem(request, successfulResults);

      if (rootItem) {
        onProgress?.({ stepKey: "root-item", label: "Root Item" }, "complete");
        result = createBaseResult(request, rootItem);

        for (const collectorResult of successfulResults) {
          mergeCollectorResult(result, collectorResult);
        }
      }
    }
  } catch (error) {
    harvestError = error;
  } finally {
    signal?.removeEventListener("abort", abortListener);

    try {
      await restoreOriginalEditorState(request);
    } catch (restoreError) {
      extensionLog.error("Reference graph: failed to restore captured editor state", {
        requestId: request.requestId,
        originalEditorState: request.session?.originalEditorState,
        restoreError,
      });

      harvestError ??= restoreError;
    }
  }

  if (harvestError) throw harvestError;

  return signal?.aborted ? undefined : result;
}

async function restoreOriginalEditorState(request: HarvestRequest): Promise<void> {
  const original = request.session?.originalEditorState;
  if (!original) return;

  extensionLog.debug("Reference graph: restoring captured editor state", {
    requestId: request.requestId,
    rawValues: original.rawValues,
    standardFields: original.standardFields,
  });

  await setEditorState(request, original.rawValues, original.standardFields);

  extensionLog.debug("Reference graph: captured editor state verified", {
    requestId: request.requestId,
    rawValues: original.rawValues,
    standardFields: original.standardFields,
  });
}