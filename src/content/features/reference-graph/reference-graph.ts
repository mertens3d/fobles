// @source-path [fobles] src/content/features/reference-graph/reference-graph.ts

import type { HarvestSession } from "../../sitecore-harvester/harvest-session.types";
import { buildFoblesUrl } from "../augmentor/helper";
import { getReferenceGraphFilters } from "../../../shared/reference-graph-settings";
import { extensionLog } from "../../logger";
import { PROGRESS_STEPS } from "../../sitecore-harvester/planner/harvest-steps";
import { harvestSitecoreWithWorkers } from "../../sitecore-harvester/coordinator/foreground-harvest-coordinator";
import { getCurrentItemId } from "../../toolbar/jump-flyout/ai-pages";
import {
  closeReferenceGraphProgressModal,
  handleHarvestProgress,
  initializeReferenceGraphProgressModal,
  openReferenceGraphProgressModal,
} from "./build-progress";
import { prepareReferenceGraph } from "./prepared-reference-graph";
import { harvestGraphForLink } from "./harvester";
import { openReferenceGraphModal } from "./reference-graph-modal";
import { acquireReferenceGraphSessionLock, releaseReferenceGraphSessionLock } from "./reference-graph-session-lock";
import { startReferenceGraphTimer } from "./reference-graph-timing";
import { disposeBackgroundWorkerPool } from "../../sitecore-worker/pool/worker-pool-client";
import {
  getScRawValuesState,
  getScStandardFieldsState,
} from "../../macros/ribbon-toggle-macro";
import { showFoblesErrorDialog } from "../../../shared/error-dialog";

export let referenceGraphAbortController: AbortController | undefined = undefined;

let activeReferenceGraphSession: Promise<void> | undefined;

async function captureHarvestSession(doc: Document): Promise<HarvestSession> {
  const rawValues = await getScRawValuesState(doc);
  const standardFields = await getScStandardFieldsState(doc);

  const session: HarvestSession = {
    requestId: crypto.randomUUID(),
    originalEditorState: { rawValues, standardFields },
  };

  extensionLog.debug("Reference graph: captured caller editor state", {
    requestId: session.requestId,
    rawValues,
    standardFields,
  });

  return session;
}

function cancelReferenceGraph(doc: Document): void {
  referenceGraphAbortController?.abort();
  closeReferenceGraphProgressModal(doc);
  void disposeBackgroundWorkerPool();
}

async function executeReferenceGraphSession(doc: Document): Promise<void> {
  startReferenceGraphTimer();

  const controller = new AbortController();
  const itemId = getCurrentItemId(doc);

  if (!itemId) {
    extensionLog.warn("Reference graph: could not resolve current item id");
    showFoblesErrorDialog(doc, {
      title: "Reference Graph",
      message: "Something has gone wrong. The current Sitecore item could not be resolved.",
    });
    return;
  }

  referenceGraphAbortController = controller;
  const filters = await getReferenceGraphFilters();
  const harvestSession = await captureHarvestSession(doc);

  initializeReferenceGraphProgressModal(doc, PROGRESS_STEPS, filters);
  openReferenceGraphProgressModal(doc, () => cancelReferenceGraph(doc));

  try {
    extensionLog.debug("REFERENCE GRAPH: awaiting worker-pool harvest");

    const graph = await harvestSitecoreWithWorkers(
      {
        requestId: harvestSession.requestId,
        url: buildFoblesUrl(itemId),
        filters,
        session: harvestSession,
      },
      {
        signal: controller.signal,
        onProgress: (step, status) => {
          handleHarvestProgress(doc, step, status);
        },
      },
    );

    let preparedGraph:
      | Awaited<ReturnType<typeof prepareReferenceGraph>>
      | undefined;

    if (!controller.signal.aborted && graph) {
      preparedGraph = await prepareReferenceGraph(graph, filters, {
        signal: controller.signal,
        onProgress: (step, status) => {
          handleHarvestProgress(doc, step, status);
        },
      });
    }

    if (!controller.signal.aborted && preparedGraph) {
      openReferenceGraphModal(
        doc,
        preparedGraph,
        async (link, graphFilters, existingResult) =>
          await harvestGraphForLink(
            link,
            doc,
            referenceGraphAbortController,
            graphFilters,
            existingResult,
          ),
        () => { void releaseReferenceGraphSessionLock(); },
      );
    } else {
      closeReferenceGraphProgressModal(doc);

      if (!controller.signal.aborted) {
        extensionLog.warn(
          "REFERENCE GRAPH: harvest did not produce a prepared graph",
          {
            hasGraph: Boolean(graph),
            hasPreparedGraph: Boolean(preparedGraph),
          },
        );

        showFoblesErrorDialog(doc, {
          title: "Reference Graph",
          message: "Something has gone wrong. The Reference Graph could not be prepared.",
        });
      }
    }
  } catch (error) {
    closeReferenceGraphProgressModal(doc);

    if (controller.signal.aborted) {
      extensionLog.debug("REFERENCE GRAPH: cancelled", {
        itemId,
        error,
      });
    } else {
      extensionLog.error(
        "REFERENCE GRAPH: harvest or graph preparation failed",
        {
          itemId,
          error,
        },
      );

      showFoblesErrorDialog(doc, {
        title: "Reference Graph",
        message:
          error instanceof Error
            ? error.message
            : "Something has gone wrong while building the Reference Graph.",
      });
    }
  } finally {
    if (referenceGraphAbortController === controller) {
      referenceGraphAbortController = undefined;
    }
  }
}

export async function openReferenceGraph(doc: Document): Promise<void> {
  if (activeReferenceGraphSession) return;
  const acquired = await acquireReferenceGraphSessionLock();
  if (!acquired) {
    showFoblesErrorDialog(doc, {
      title: "Reference Graph Already Active",
      message:
        "Only one Reference Graph can be active in this browser session. " +
        "Close the existing graph, or use another browser profile or Incognito window.",
    });
    return;
  }
  const session = executeReferenceGraphSession(doc);
  activeReferenceGraphSession = session;
  try { await session; }
  catch (error) { await releaseReferenceGraphSessionLock(); throw error; }
  finally { if (activeReferenceGraphSession === session) activeReferenceGraphSession = undefined; }
}
