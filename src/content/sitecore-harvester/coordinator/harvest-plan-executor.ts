// @source-path [fobles] src/content/sitecore-harvester/coordinator/harvest-plan-executor.ts

import { extensionLog } from "../../logger";
import { initializeRuntimeSettings, isRuntimeFaultEnabled, RUNTIME_FAULT } from "../../runtime-settings/runtime-settings";
import { HARVEST_STEPS } from "../harvest-steps";
import type { HarvestProgressCallback, HarvestRequest, ProgressStep } from "../sitecore-harvester.types";
import { cancelWorkerTask, runWorkerTask } from "../worker-pool/worker-pool-client";
import { createErrorResult, type WorkerTask, type WorkerTaskResult, type WorkerTaskType } from "../worker-pool/worker-task.types";
import { createEditorStateTask, FILTER_KEY_BY_COLLECTOR_TASK_TYPE, planCollectorTaskGroups, planCollectorTasks } from "./harvest-task-planner";

const TASK_TIMEOUT_MS = 30000;
const HARVEST_STEP_BY_FILTER_KEY = new Map(HARVEST_STEPS.map((step) => [step.filterKey, step] as const));

function stepForTaskType(type: WorkerTaskType): ProgressStep | undefined {
    const filterKey = FILTER_KEY_BY_COLLECTOR_TASK_TYPE.get(type);
    return filterKey ? HARVEST_STEP_BY_FILTER_KEY.get(filterKey) : undefined;
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

            return createErrorResult(task, error instanceof Error ? error.message : "Worker task rejected");
        },
    );

    try {
        return await Promise.race([workerResult, timeoutResult]);
    } finally {
        if (timeoutId !== undefined) clearTimeout(timeoutId);
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
    throwForFailedResults([result]);

    const verified =
        result.status === "success" &&
        result.type === "set-editor-state" &&
        result.payload.editorState.rawValues === rawValues &&
        result.payload.editorState.standardFields === standardFields;

    if (!verified) {
        throw new Error(
            `Editor-state verification failed during ${phase}: ` +
            `requested Raw=${String(rawValues)}, Standard=${String(standardFields)}`,
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

async function restoreOriginalState(request: HarvestRequest): Promise<void> {
  const original = request.session?.originalEditorState;
  if (!original) return;

  await initializeRuntimeSettings();

  if (isRuntimeFaultEnabled(RUNTIME_FAULT.REFERENCE_GRAPH_RESTORE_EDITOR_STATE)) {
    throw new Error("Injected Reference Graph editor-state restoration failure");
  }

  await setAndVerifyEditorState(
    request,
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
        await setAndVerifyEditorState(request, false, true, "normal-harvest");
        const normalResults = await dispatchTasks(normalTasks, onProgress);

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