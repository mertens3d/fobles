// @source-path [fobles] src/content/features/reference-graph/pending-reference-graph.ts

import { STORAGE } from "../../../constants/extension-constants";
import { getReferenceGraphFilters } from "../../../shared/reference-graph-settings";
import { buildFoblesUrl } from "../augmentor/helper";
import { extensionLog } from "../../logger";
import {
  getScRawValuesState,
  getScStandardFieldsState,
  setScRawValuesState,
  setScStandardFieldsState,
  type BooleanTripleState,
} from "../../macros/ribbon-toggle-macro";
import { harvestSitecoreWithWorkers } from "../../sitecore-harvester/coordinator/foreground-harvest-coordinator";
import {
  closeReferenceGraphProgressModal,
  handleHarvestProgress,
} from "./build-progress";
import { prepareReferenceGraph } from "./prepared-reference-graph";
import type { PendingReferenceGraph } from "./graph.types";
import { harvestGraphForLink } from "./harvester";
import { openReferenceGraphModal } from "./reference-graph-modal";

type AbortControllerCallback = (controller: AbortController) => void;

export function readPendingReferenceGraph(): PendingReferenceGraph | undefined {
  try {
    const raw = localStorage.getItem(STORAGE.KEY.REFERENCE_GRAPH.PENDING);

    return raw ? (JSON.parse(raw) as PendingReferenceGraph) : undefined;
  } catch {
    return undefined;
  }
}

function writePendingReferenceGraph(pending: PendingReferenceGraph): void {
  localStorage.setItem(
    STORAGE.KEY.REFERENCE_GRAPH.PENDING,
    JSON.stringify(pending),
  );
}

function clearPendingReferenceGraph(): void {
  localStorage.removeItem(STORAGE.KEY.REFERENCE_GRAPH.PENDING);
}

export function createPendingReferenceGraph(
  itemId: string,
  restoreRawValues: BooleanTripleState,
  restoreStandardFields: BooleanTripleState,
): PendingReferenceGraph {
  const pending: PendingReferenceGraph = {
    itemId,
    restoreRawValues,
    restoreStandardFields,
    harvested: false,
    cancelled: false,
    graph: undefined,
  };

  writePendingReferenceGraph(pending);

  return pending;
}

export function cancelPendingReferenceGraph(clear = false): void {
  const pending = readPendingReferenceGraph();

  if (pending) {
    if (clear) {
      clearPendingReferenceGraph();
    } else {
      writePendingReferenceGraph({
        ...pending,
        cancelled: true,
      });
    }
  }
}

export async function advancePendingReferenceGraph(
  doc: Document,
  pending: PendingReferenceGraph,
  onControllerCreated: AbortControllerCallback,
): Promise<void> {
  extensionLog.debug(
    `[${advancePendingReferenceGraph.name}] advancing pending reference graph`,
    {
      pending,
    },
  );

  if (!pending.cancelled && !pending.harvested) {
    if (!pending.restoreRawValues) {
      const currentState = await getScRawValuesState(doc);

      if (!currentState) {
        await setScRawValuesState(doc, true);

        return;
      }
    }

    if (!pending.restoreStandardFields) {
      const currentState = await getScStandardFieldsState(doc);

      if (!currentState) {
        await setScStandardFieldsState(doc, true);

        return;
      }
    }

    const controller = new AbortController();

    onControllerCreated(controller);

    const filters = await getReferenceGraphFilters();

    void harvestSitecoreWithWorkers(
      {
        requestId: crypto.randomUUID(),
        url: buildFoblesUrl(pending.itemId),
        filters,
      },
      {
        signal: controller.signal,
        onProgress: (step, status) => handleHarvestProgress(doc, step, status),
      },
    ).then(async (graph): Promise<void> => {
      const latest = readPendingReferenceGraph() ?? pending;

      const harvestedPending: PendingReferenceGraph = {
        ...latest,
        harvested: true,
        graph: latest.cancelled ? undefined : graph,
      };

      writePendingReferenceGraph(harvestedPending);

      await advancePendingReferenceGraph(
        doc,
        harvestedPending,
        onControllerCreated,
      );
    });

    return;
  }

  if (
    pending.restoreStandardFields &&
    (await getScStandardFieldsState(doc)) !== pending.restoreStandardFields
  ) {
    await setScStandardFieldsState(doc, pending.restoreStandardFields);

    return;
  }

  if (
    pending.restoreRawValues &&
    (await getScRawValuesState(doc)) !== pending.restoreRawValues
  ) {
    await setScRawValuesState(doc, pending.restoreRawValues);

    return;
  }

  clearPendingReferenceGraph();

  const filters = await getReferenceGraphFilters();

  if (pending.graph) {
    const preparedGraph = await prepareReferenceGraph(pending.graph, {
      onProgress: (step, status) => handleHarvestProgress(doc, step, status),
    });

    closeReferenceGraphProgressModal(doc);

    if (preparedGraph) {
      openReferenceGraphModal(
        doc,
        preparedGraph,
        async (link, _filters, existingResult) =>
          await harvestGraphForLink(
            link,
            doc,
            undefined,
            filters,
            existingResult,
          ),
      );
    }
  } else {
    closeReferenceGraphProgressModal(doc);
  }
}
