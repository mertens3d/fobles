// @source-path [fobles] src/content/sitecore-harvester/background-tab/worker-task-executor.ts

import { collectChildren } from "../collectors/child-collector";
import { collectParent } from "../collectors/parent-collector";
import { collectReferrers } from "../collectors/referrer-collector";
import { collectLayouts } from "../collectors/section-collector/layout-collector/layout-collector";
import { collectSections } from "../collectors/section-collector/section-collector";
import { buildItemGraphNodeDataFromDoc } from "../enrichment/item-enricher";
import { harvestStepRootItem } from "../harvest-sitecore";
import {
  getScRawValuesState,
  getScStandardFieldsState,
  setScRawValuesState,
  setScStandardFieldsState,
} from "../../macros/ribbon-toggle-macro";
import type {
  HarvestContext,
  SitecoreHarvestResult,
} from "../sitecore-harvester.types";
import {
  createCancelledResult,
  createDocumentStaleResult,
  createErrorResult,
  type WorkerTask,
  type WorkerTaskExecutionResult,
  type WorkerTaskPayloadByType,
  type WorkerTaskResult,
  type WorkerTaskType,
} from "../worker-pool/worker-task.types";

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
      sections: undefined,
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

type WorkerEditorState = {
  rawValues: boolean;
  standardFields: boolean;
};

export async function executeWorkerTask(
  doc: Document,
  task: WorkerTask,
  signal: AbortSignal,
): Promise<WorkerTaskExecutionResult> {
  let result: WorkerTaskExecutionResult | undefined = cancelledResultIfAborted(task, signal);

  if (!result && (await ensureWorkerEditorState(doc, task))) {
    result = createDocumentStaleResult(task);
  }

  if (!result) {
    if (task.type === "set-editor-state") {
      result = successResult(task, { editorState: task.editorState });
    } else if (task.type === "collect-root-item") {
      const rootItem = harvestStepRootItem(doc);
      result = rootItem
        ? successResult(task, { rootItem })
        : createErrorResult(task, "Could not resolve current item id");
    } else if (task.type === "enrich-item") {
      const item = buildItemGraphNodeDataFromDoc(doc);
      result = item.scItemId || item.scItemPath
        ? successResult(task, { item })
        : createErrorResult(task, "Could not resolve item at navigated url");
    } else {
      const harvestContext = buildHarvestContext(doc, signal);

      if (!harvestContext) {
        result = createErrorResult(task, "Could not resolve current item id");
      } else {
        switch (task.type) {
          case "collect-parent":
            await collectParent(harvestContext);
            result = cancelledResultIfAborted(task, signal) ??
              successResult(task, { parent: harvestContext.result.parent });
            break;
          case "collect-children":
            await collectChildren(harvestContext);
            result = cancelledResultIfAborted(task, signal) ??
              successResult(task, { childItems: harvestContext.result.childItems ?? [] });
            break;
          case "collect-referrers":
            await collectReferrers(harvestContext);
            result = cancelledResultIfAborted(task, signal) ??
              successResult(task, { referrers: harvestContext.result.referrers ?? [] });
            break;
          case "collect-sections":
            await collectSections(harvestContext);
            result = cancelledResultIfAborted(task, signal) ??
              successResult(task, { sections: harvestContext.result.sections ?? [] });
            break;
          case "collect-layouts":
            await collectLayouts(harvestContext);
            result = cancelledResultIfAborted(task, signal) ??
              successResult(task, {
                layoutSectionFields: harvestContext.result.layoutSectionFields ?? [],
              });
            break;
        }
      }
    }
  }

  return result ?? createErrorResult(task, "Worker task produced no result");
}
type WorkerEditorRequirements = {
  rawValues?: boolean;
  standardFields?: boolean;
};

function getEditorRequirements(task: WorkerTask): WorkerEditorRequirements {
  if (task.type === "set-editor-state") {
    return {
      rawValues: task.editorState.rawValues,
      standardFields: task.editorState.standardFields,
    };
  }

  return {};
}

async function ensureWorkerEditorState(doc: Document, task: WorkerTask): Promise<boolean> {
  const requirements = getEditorRequirements(task);

  if (requirements.rawValues !== undefined) {
    const current = await getScRawValuesState(doc);

    if (current !== undefined && current !== requirements.rawValues) {
      await setScRawValuesState(doc, requirements.rawValues);
      return true;
    }
  }

  if (requirements.standardFields !== undefined) {
    const current = await getScStandardFieldsState(doc);

    if (current !== undefined && current !== requirements.standardFields) {
      await setScStandardFieldsState(doc, requirements.standardFields);
      return true;
    }
  }

  return false;
}