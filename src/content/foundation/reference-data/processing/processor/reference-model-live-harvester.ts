// @source-path [fobles] src/content/foundation/reference-data/processing/processor/reference-model-live-harvester.ts

import { extensionLog } from "../../../../logger";
import { mergeEnrichedItem } from "../../../harvesting/planner/enrichment-task-planner";
import { createSitecoreItemLocator } from "../../../harvesting/worker-task-executor";
import { buildFoblesUrl } from "../../../sitecore/fobles-url";
import { createErrorResult } from "../../../workers/tasks/worker-task.js";
import type { WorkerTaskExecutionResult, WorkerTask } from "../../../workers/tasks/tasks.types.js";
import type { ReferenceModelNode } from "../../model/model.types.ts";
import { itemsFor } from "./reference-model-processing-tree-state.ts";
import type { ProcessingStatus, ReferenceHarvestingOutcome, StartReferenceModelProcessorOptions } from "../processing.types.ts";

export async function requestReferenceModelHarvest(
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
      extensionLog.warn("Reference model processor: Reference Harvesting task failed", { task, error });
    }
    result = createErrorResult(
      { ...task, requestId: workSession.id },
      error instanceof Error ? error.message : "Reference Harvesting task failed",
    );
  }

  return result;
}

export function applyReferenceModelReferenceHarvestingOutcome(
  guid: string,
  treeNodeIds: string[],
  nodesById: Map<string, ReferenceModelNode>,
  outcome: ReferenceHarvestingOutcome,
): ProcessingStatus {
  if (outcome.kind !== "not-found" && outcome.kind !== "failed") {
    mergeEnrichedItem(new Map([[guid, itemsFor(treeNodeIds, nodesById)]]), guid, outcome.value);
  }

  return outcome.kind;
}
