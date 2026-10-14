// @source-path [fobles] src/content/features/reference-graph/reference-graph.ts

import { STORAGE } from "../../../constants/extension-constants";
import { extensionLog } from "../../logger";
import { buildFoblesUrl } from "../../features/augmentor/helper";
import type cytoscape from "cytoscape";
import { buildElements } from "./graph-nodes/graph-elements";
import {
  getScRawValuesState,
  getScStandardFieldsState,
  setScRawValuesState,
  setScStandardFieldsState,
  type BooleanTripleState,
} from "../../macros/ribbon-toggle-macro";
import { harvestSitecoreWithWorkers } from "../../sitecore-harvester/coordinator/foreground-harvest-coordinator";
import { openReferenceGraphModal } from "./reference-graph-modal";
import {
  closeReferenceGraphProgressModal,
  handleHarvestProgress,
  initializeReferenceGraphProgressModal,
  openReferenceGraphProgressModal,
} from "./build-progress";
import type { PendingReferenceGraph } from "./graph.types";
import { harvestGraphForLink } from "./harvester";
import { getReferenceGraphFilters } from "../../../shared/reference-graph-settings";
import { PROGRESS_STEPS } from "../../sitecore-harvester/harvest-steps";
import { getCurrentItemId } from "../../toolbar/jump-flyout/ai-pages";
import { startReferenceGraphTimer } from "./reference-graph-timing";

// Shared by the fast path (harvestAndOpen) and the slow, reload-spanning path - Cancel aborts
// whichever one is currently in flight; a stale/already-settled controller is harmless to abort.
export let referenceGraphAbortController: AbortController | undefined =
  undefined;

function cancelReferenceGraph(doc: Document): void {
  referenceGraphAbortController?.abort();
  const pending = readPendingReferenceGraph();
  if (pending) writePendingReferenceGraph({ ...pending, cancelled: true });
  closeReferenceGraphProgressModal(doc);
}
async function harvestAndOpen(
  doc: Document,
): Promise<void> {
  const controller =
    new AbortController();

  const itemId =
    getCurrentItemId(doc);

  if (itemId) {
    referenceGraphAbortController =
      controller;

    const filters =
      await getReferenceGraphFilters();

    initializeReferenceGraphProgressModal(
      doc,
      PROGRESS_STEPS,
      filters,
    );

    try {
      extensionLog.debug(
        "REFERENCE GRAPH: awaiting worker-pool harvest",
      );

      const graph =
        await harvestSitecoreWithWorkers(
          {
            requestId:
              crypto.randomUUID(),
            url:
              buildFoblesUrl(
                itemId,
              ),
            filters,
          },
          {
            signal:
              controller.signal,
            onProgress:
              (
                step,
                status,
              ) => {
                handleHarvestProgress(
                  doc,
                  step,
                  status,
                );
              },
          },
        );

      let initialElements:
        | cytoscape.ElementDefinition[]
        | undefined = undefined;

      if (
        !controller.signal.aborted &&
        graph
      ) {
        initialElements =
          await buildElements(
            graph,
            {
              signal:
                controller.signal,
              onProgress:
                (
                  step,
                  status,
                ) => {
                  handleHarvestProgress(
                    doc,
                    step,
                    status,
                  );
                },
            },
          );
      }

      if (
        !controller.signal.aborted &&
        graph &&
        initialElements
      ) {
        openReferenceGraphModal(
          doc,
          graph,
          initialElements,
          async (
            link,
            graphFilters,
            existingResult,
          ) =>
            await harvestGraphForLink(
              link,
              doc,
              referenceGraphAbortController,
              graphFilters,
              existingResult,
            ),
        );
      } else {
        closeReferenceGraphProgressModal(
          doc,
        );

        extensionLog.warn(
          "REFERENCE GRAPH: harvest did not produce a prepared graph",
          {
            aborted:
              controller.signal
                .aborted,
            hasGraph:
              Boolean(graph),
            hasInitialElements:
              Boolean(initialElements),
          },
        );
      }
    } catch (error) {
      closeReferenceGraphProgressModal(
        doc,
      );

      extensionLog.error(
        "REFERENCE GRAPH: harvest or graph preparation failed",
        {
          itemId,
          aborted:
            controller.signal
              .aborted,
          error,
        },
      );
    }
  } else {
    closeReferenceGraphProgressModal(
      doc,
    );

    extensionLog.warn(
      "REFERENCE GRAPH: could not resolve current item id",
    );
  }
}

function readPendingReferenceGraph(): PendingReferenceGraph | undefined {
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

// Drives one step of the enable -> harvest -> restore sequence, each step separated by a full
// page reload (see the file header comment). Re-entrant: called both right after the button
// click and again on every subsequent page load via resumeReferenceGraph, until nothing is left
// to flip. A cancelled request skips straight to restoring the original toggle state - the view
// settings it already flipped shouldn't be left changed just because the user gave up waiting.
async function advancePendingReferenceGraph(
  doc: Document,
  pending: PendingReferenceGraph,
): Promise<void> {
  extensionLog.debug(
    `[${advancePendingReferenceGraph.name}] advancing pending reference graph`,
    { pending },
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
    referenceGraphAbortController = controller;
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
    ).then(
      async (graph) => {
        // Re-read rather than trust the closed-over pending - Cancel may have flagged it while fetches were in flight.
        const latest = readPendingReferenceGraph() ?? pending;
        const harvestedPending: PendingReferenceGraph = {
          ...latest,
          harvested: true,
          graph: latest.cancelled ? undefined : graph,
        };
        writePendingReferenceGraph(harvestedPending);
        await advancePendingReferenceGraph(doc, harvestedPending);
      },
    );
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
    const initialElements = await buildElements(
      pending.graph,
      {
        onProgress: (step, status) =>
          handleHarvestProgress(doc, step, status),
      },
    );

    closeReferenceGraphProgressModal(doc);

    openReferenceGraphModal(
      doc,
      pending.graph,
      initialElements,
      async (link, _filters, existingResult) =>
        await harvestGraphForLink(
          link,
          doc,
          undefined,
          filters,
          existingResult,
        ),
    );
   } else {
    closeReferenceGraphProgressModal(
      doc,
    );
  }
}


export async function openReferenceGraph(
  doc: Document,
): Promise<void> {
  startReferenceGraphTimer();

  extensionLog.debug(
    `[${openReferenceGraph.name}] advancing pending reference graph`,
    {
      doc: doc.URL,
    },
  );

  const itemId =
    getCurrentItemId(doc);

  if (!itemId) {
    extensionLog.warn(
      "Reference graph: could not resolve current item id",
    );
  } else {
    openReferenceGraphProgressModal(
      doc,
      () =>
        cancelReferenceGraph(doc),
    );

    const rawValuesOn:
      BooleanTripleState =
      await getScRawValuesState(doc);

    const standardFieldsOn:
      BooleanTripleState =
      await getScStandardFieldsState(
        doc,
      );

    if (
      rawValuesOn &&
      standardFieldsOn
    ) {
      await harvestAndOpen(doc);
    } else {
      const pending:
        PendingReferenceGraph = {
        itemId,
        restoreRawValues:
          rawValuesOn,
        restoreStandardFields:
          standardFieldsOn,
        harvested: false,
        cancelled: false,
        graph: undefined,
      };

      writePendingReferenceGraph(
        pending,
      );

      await advancePendingReferenceGraph(
        doc,
        pending,
      );
    }
  }
}

// Hooked into every page load (see src/content/toolbar-runtime.ts) so the enable/restore
// sequence above keeps going across each reload it triggers.
export async function resumeReferenceGraph(doc: Document): Promise<void> {
  const pending = readPendingReferenceGraph();
  if (!pending) return;

  if (getCurrentItemId(doc) !== pending.itemId) {
    clearPendingReferenceGraph();
    return;
  }

  if (!pending.cancelled)
    openReferenceGraphProgressModal(doc, () => cancelReferenceGraph(doc));
  await advancePendingReferenceGraph(doc, pending);
}
