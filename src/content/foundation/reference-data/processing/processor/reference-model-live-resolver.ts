// @source-path [fobles] src/content/foundation/reference-data/processing/processor/reference-model-live-resolver.ts

import { extensionLog } from "../../../../logger";
import { mergeEnrichedItem } from "../../../harvesting/planner/enrichment-task-planner";
import { createSitecoreItemLocator } from "../../../harvesting/worker-task-executor";
import { buildFoblesUrl } from "../../../sitecore/fobles-url";
import { createErrorResult } from "../../../workers/tasks/worker-task.js";
import type { WorkerTaskExecutionResult, WorkerTask } from "../../../workers/tasks/tasks.types.js";
import type { ReferenceModelNode } from "../../model/model.types";
import { itemsFor } from "./reference-model-processing-tree-state";
import type { ProcessingStatus, ResolveOutcome, StartReferenceModelProcessorOptions } from "../processing.types.js";

export async function requestReferenceModelResolve(
  workSession: StartReferenceModelProcessorOptions["workSession"],
  reference: string,
  disposed: boolean,
): Promise<WorkerTaskExecutionResult> {
  const task: Omit<Extract<WorkerTask, { type: "get-quick-info" }>, "requestId"> = {
    taskId: crypto.randomUUID(),
    type: "get-quick-info",
    url: buildFoblesUrl(reference),
    requested: createSitecoreItemLocator(reference),
  };
  let result: WorkerTaskExecutionResult;

  try {
    const taskResult = await workSession.runTask(task);
    result = taskResult ?? createErrorResult({ ...task, requestId: workSession.id }, "No response from worker pool");
  } catch (error) {
    if (!disposed) {
      extensionLog.warn("Reference model processor: resolve task failed", { task, error });
    }
    result = createErrorResult(
      { ...task, requestId: workSession.id },
      error instanceof Error ? error.message : "Resolve task failed",
    );
  }

  return result;
}

export function applyReferenceModelResolveOutcome(
  guid: string,
  treeNodeIds: string[],
  nodesById: Map<string, ReferenceModelNode>,
  outcome: ResolveOutcome,
): ProcessingStatus {
  if (outcome.kind !== "not-found" && outcome.kind !== "failed") {
    mergeEnrichedItem(new Map([[guid, itemsFor(treeNodeIds, nodesById)]]), guid, outcome.value);
  }

  return outcome.kind;
}
