// @source-path [fobles] src/content/sitecore-harvester/background-tab/worker-task-executor.ts

import { collectParent } from "../collectors/parent-collector";
import { collectChildren } from "../collectors/child-collector";
import { collectReferrers } from "../collectors/referrer-collector";
import { collectSections } from "../collectors/section-collector/section-collector";
import { collectLayouts } from "../collectors/section-collector/layout-collector/layout-collector";
import { buildItemGraphNodeDataFromDoc } from "../enrichment/item-enricher";
import { harvestStepRootItem } from "../harvest-sitecore";
import type { HarvestContext, SitecoreHarvestResult } from "../sitecore-harvester.types";
import {
  createErrorResult,
  type WorkerTask,
  type WorkerTaskPayloadByType,
  type WorkerTaskResult,
  type WorkerTaskType,
} from "../worker-pool/worker-task.types";

function buildHarvestContext(doc: Document, signal: AbortSignal): HarvestContext | undefined {
  const rootItem = harvestStepRootItem(doc);
  if (!rootItem) {
    return undefined;
  }

  const result: SitecoreHarvestResult = {
    rootItem,
    parent: undefined,
    layoutSectionFields: undefined,
    sections: undefined,
    childItems: undefined,
    referrers: undefined,
  };

  return { doc, result, signal, rootItem };
}

function successResult<TType extends WorkerTaskType>(
  task: { requestId: string; taskId: string; type: TType },
  payload: WorkerTaskPayloadByType[TType],
): WorkerTaskResult {
  return {
    requestId: task.requestId,
    taskId: task.taskId,
    type: task.type,
    status: "success",
    payload,
  } as WorkerTaskResult;
}

export async function executeWorkerTask(
  doc: Document,
  task: WorkerTask,
  signal: AbortSignal,
): Promise<WorkerTaskResult> {
  if (task.type === "collect-root-item") {
    const rootItem = harvestStepRootItem(doc);
    return rootItem
      ? successResult(task, { rootItem })
      : createErrorResult(task, "Could not resolve current item id");
  }

  if (task.type === "enrich-item") {
    const item = buildItemGraphNodeDataFromDoc(doc);
    return item.scItemId || item.scItemPath
      ? successResult(task, { item })
      : createErrorResult(task, "Could not resolve item at navigated url");
  }

  const harvestContext = buildHarvestContext(doc, signal);
  if (!harvestContext) {
    return createErrorResult(task, "Could not resolve current item id");
  }

  switch (task.type) {
    case "collect-parent":
      await collectParent(harvestContext);
      return successResult(task, { parent: harvestContext.result.parent });
    case "collect-children":
      await collectChildren(harvestContext);
      return successResult(task, {
        childItems: harvestContext.result.childItems ?? [],
      });
    case "collect-referrers":
      await collectReferrers(harvestContext);
      return successResult(task, {
        referrers: harvestContext.result.referrers ?? [],
      });
    case "collect-sections":
      await collectSections(harvestContext);
      return successResult(task, {
        sections: harvestContext.result.sections ?? [],
      });
    case "collect-layouts":
      await collectLayouts(harvestContext);
      return successResult(task, {
        layoutSectionFields: harvestContext.result.layoutSectionFields ?? [],
      });
    default: {
      const unreachable: never = task;
      const fallbackTask = unreachable as WorkerTask;
      return createErrorResult(fallbackTask, `Unsupported worker task type: ${fallbackTask.type}`);
    }
  }
}
