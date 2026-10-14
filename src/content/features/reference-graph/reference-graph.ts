// @source-path [fobles] src/content/features/reference-graph/reference-graph.ts

import type cytoscape from "cytoscape";
import { buildFoblesUrl } from "../augmentor/helper";
import { getReferenceGraphFilters } from "../../../shared/reference-graph-settings";
import { extensionLog } from "../../logger";
import {
  getScRawValuesState,
  getScStandardFieldsState,
  type BooleanTripleState,
} from "../../macros/ribbon-toggle-macro";
import { PROGRESS_STEPS } from "../../sitecore-harvester/harvest-steps";
import { harvestSitecoreWithWorkers } from "../../sitecore-harvester/coordinator/foreground-harvest-coordinator";
import { getCurrentItemId } from "../../toolbar/jump-flyout/ai-pages";
import {
  closeReferenceGraphProgressModal,
  handleHarvestProgress,
  initializeReferenceGraphProgressModal,
  openReferenceGraphProgressModal,
} from "./build-progress";
import { buildElements } from "./graph-nodes/graph-elements";
import { harvestGraphForLink } from "./harvester";
import {
  advancePendingReferenceGraph,
  cancelPendingReferenceGraph,
  createPendingReferenceGraph,
  readPendingReferenceGraph,
} from "./pending-reference-graph";
import { openReferenceGraphModal } from "./reference-graph-modal";
import { startReferenceGraphTimer } from "./reference-graph-timing";

export let referenceGraphAbortController:
  AbortController | undefined = undefined;

function cancelReferenceGraph(
  doc: Document,
): void {
  referenceGraphAbortController?.abort();

  cancelPendingReferenceGraph();

  closeReferenceGraphProgressModal(
    doc,
  );
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
      const pending =
        createPendingReferenceGraph(
          itemId,
          rawValuesOn,
          standardFieldsOn,
        );

      await advancePendingReferenceGraph(
        doc,
        pending,
        (controller: AbortController) => {
          referenceGraphAbortController =
            controller;
        },
      );
    }
  }
}

export async function resumeReferenceGraph(
  doc: Document,
): Promise<void> {
  const pending =
    readPendingReferenceGraph();

  if (pending) {
    if (
      getCurrentItemId(doc) !==
      pending.itemId
    ) {
      cancelPendingReferenceGraph(
        true,
      );
    } else {
      if (!pending.cancelled) {
        openReferenceGraphProgressModal(
          doc,
          () =>
            cancelReferenceGraph(doc),
        );
      }

      await advancePendingReferenceGraph(
        doc,
        pending,
        (controller: AbortController) => {
          referenceGraphAbortController =
            controller;
        },
      );
    }
  }
}