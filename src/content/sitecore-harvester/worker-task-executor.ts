// @source-path [fobles] src/content/sitecore-harvester/worker-task-executor.ts

import { collectChildren } from "./collectors/child-collector";
import { collectParent } from "./collectors/parent-collector";
import { collectReferrers } from "./collectors/referrer-collector";
import { collectLayouts } from "./collectors/section-collector/layout-collector/layout-collector";
import { collectSections } from "./collectors/section-collector/section-collector";
import { isGuidLike } from "../features/augmentor/shared/guid";
import { buildItemGraphNodeDataFromDoc } from "./enrichment/item-enricher";
import { harvestStepRootItem } from "./harvest-sitecore";
import {
  getScRawValuesState,
  getScStandardFieldsState,
  setScRawValuesState,
  setScStandardFieldsState,
} from "../macros/ribbon-toggle-macro";
import type { HarvestContext, SitecoreHarvestResult } from "./sitecore-harvester.types";
import {
  createCancelledResult,
  createDocumentStaleResult,
  createErrorResult,
  type SitecoreItemLocator,
  type SitecoreResolvedResult,
  type WorkerTask,
  type WorkerTaskExecutionResult,
  type WorkerTaskPayloadByType,
  type WorkerTaskResult,
  type WorkerTaskType,
} from "../sitecore-worker/tasks/worker-task.types";
import type { ItemGraphNodeData } from "../data-tree/sitecore-item.types";

function normalizeSitecoreItemId(value: string | undefined): string | undefined {
  return value
    ?.replace(/[{}]/g, "")
    .trim()
    .toLowerCase();
}

function buildHarvestContext(
  doc: Document,
  signal: AbortSignal,
): HarvestContext | undefined {
  const rootItem = harvestStepRootItem(doc);
  let harvestContext: HarvestContext | undefined;

  if (rootItem) {
    const result: SitecoreHarvestResult = {
      rootItem,
      parent: undefined,
      layoutSectionFields: undefined,
      customFieldSections: undefined,
      standardFieldSections: undefined,
      childItems: undefined,
      referrers: undefined,
    };

    harvestContext = {
      doc,
      result,
      signal,
      rootItem,
    };
  }

  return harvestContext;
}

function successResult<TType extends WorkerTaskType>(
  task: {
    requestId: string;
    taskId: string;
    type: TType;
  },
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

function cancelledResultIfAborted(
  task: WorkerTask,
  signal: AbortSignal,
): WorkerTaskResult | undefined {
  let result: WorkerTaskResult | undefined;

  if (signal.aborted) {
    result = createCancelledResult(task);
  }

  return result;
}

// Quick Info is the one atomic Sitecore read where the DOM can genuinely show a DIFFERENT item
// than the one requested (Sitecore silently falling back to e.g. /sitecore/content/Home for an
// unresolved GUID) - so every result says what was requested, what actually resolved, and
// whether those agree, instead of ever handing back the fallback item as though it matched.
// Path-based requests are trusted as-is (no equality check - Sitecore's own path resolution is
// the source of truth there); only "id" requests are compared against the resolved Item ID.
function executeGetQuickInfo(
  doc: Document,
  requested: SitecoreItemLocator,
): SitecoreResolvedResult<ItemGraphNodeData> {
  const item = buildItemGraphNodeDataFromDoc(doc);
  const resolved = item.scItemId
    ? { itemId: item.scItemId, path: item.scItemPath }
    : undefined;

  if (!item.scItemId && !item.scItemPath) {
    return { requested, resolved, status: "not-found" };
  }

  if (requested.kind === "id") {
    const requestedId = normalizeSitecoreItemId(requested.value);
    const resolvedId = normalizeSitecoreItemId(item.scItemId);

    if (requestedId !== resolvedId) {
      return { requested, resolved, status: "not-found" };
    }
  }

  return { requested, resolved, value: item, status: "found" };
}

async function executeSetRawValues(
  doc: Document,
  task: WorkerTask & { type: "set-raw-values"; value: boolean },
): Promise<WorkerTaskExecutionResult> {
  const current = await getScRawValuesState(doc);

  if (current === task.value) {
    return successResult(task, { value: task.value });
  }

  await setScRawValuesState(doc, task.value);
  return createDocumentStaleResult(task);
}

async function executeSetStandardFields(
  doc: Document,
  task: WorkerTask & { type: "set-standard-fields"; value: boolean },
): Promise<WorkerTaskExecutionResult> {
  const current = await getScStandardFieldsState(doc);

  if (current === task.value) {
    return successResult(task, { value: task.value });
  }

  await setScStandardFieldsState(doc, task.value);
  return createDocumentStaleResult(task);
}

export async function executeWorkerTask(
  doc: Document,
  task: WorkerTask,
  signal: AbortSignal,
): Promise<WorkerTaskExecutionResult> {
  let result: WorkerTaskExecutionResult | undefined =
    cancelledResultIfAborted(task, signal);

  if (!result) {
    if (task.type === "get-quick-info") {
      result = successResult(task, {
        result: executeGetQuickInfo(doc, task.requested),
      });
    } else if (task.type === "set-raw-values") {
      result = await executeSetRawValues(doc, task);
    } else if (task.type === "set-standard-fields") {
      result = await executeSetStandardFields(doc, task);
    } else {
      const harvestContext =
        buildHarvestContext(doc, signal);

      if (!harvestContext) {
        result = createErrorResult(
          task,
          "Could not resolve current item id",
        );
      } else {
        switch (task.type) {
          case "get-parent":
            await collectParent(harvestContext);
            result =
              cancelledResultIfAborted(task, signal) ??
              successResult(task, {
                parent:
                  harvestContext.result.parent,
              });
            break;

          case "get-children":
            await collectChildren(harvestContext);
            result =
              cancelledResultIfAborted(task, signal) ??
              successResult(task, {
                childItems:
                  harvestContext.result.childItems ??
                  [],
              });
            break;

          case "get-referrers":
            await collectReferrers(harvestContext);
            result =
              cancelledResultIfAborted(task, signal) ??
              successResult(task, {
                referrers:
                  harvestContext.result.referrers ??
                  [],
              });
            break;

          case "get-custom-fields":
            await collectSections(harvestContext);
            result =
              cancelledResultIfAborted(task, signal) ??
              successResult(task, {
                sections:
                  harvestContext.result
                    .customFieldSections ?? [],
              });
            break;

          case "get-standard-fields":
            await collectSections(harvestContext);
            result =
              cancelledResultIfAborted(task, signal) ??
              successResult(task, {
                sections:
                  harvestContext.result
                    .standardFieldSections ?? [],
              });
            break;

          case "get-layout":
            await collectLayouts(harvestContext);
            result =
              cancelledResultIfAborted(task, signal) ??
              successResult(task, {
                layoutSectionFields:
                  harvestContext.result
                    .layoutSectionFields ?? [],
              });
            break;
        }
      }
    }
  }

  return (
    result ??
    createErrorResult(
      task,
      "Worker task produced no result",
    )
  );
}

// Reference locators are built from either a GUID or a path (never both) - kept here since both
// the harvester's own task-planning and the enrichment caller need the same classification.
export function createSitecoreItemLocator(reference: string): SitecoreItemLocator {
  return isGuidLike(reference)
    ? { kind: "id", value: reference }
    : { kind: "path", value: reference };
}