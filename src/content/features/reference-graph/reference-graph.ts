// @source-path [fobles] src/content/features/reference-graph/reference-graph.ts

import type { ReferenceGraphOperationState } from "./reference-graph.types.js";
import { showFoblesErrorDialog } from "../../../shared/error-dialog";
import { getReferenceGraphFilters } from "../../../shared/reference-graph-settings";
import { PROGRESS_STEPS } from "../../foundation/harvesting/planner/harvest-steps";
import { openFoblesDataAcquisition } from "../../foundation/reference-data/reference-data-acquisition";
import type { FoblesDataAcquisition } from "../../foundation/reference-data/reference-data.types";
import type { WorkOperation } from "../../foundation/workers/operation/work-operation.types";
import { extensionLog } from "../../logger";
import { openReferenceGraphUtility } from "../../shell/utility/fobles-utility-launchers";
import { createWorkOperation } from "../../shell/work-operation/work-operation";
import {
  closeReferenceGraphProgressModal,
  handleHarvestProgress,
  initializeReferenceGraphProgressModal,
  openReferenceGraphProgressModal,
} from "./build-progress";
import { harvestGraphForLink } from "./harvester";
import { addGraphElements } from "./prepared-reference-graph";
import type { PreparedReferenceGraph } from "./reference-graph.types";
import { startReferenceGraphTimer } from "./reference-graph-timing";

export let referenceGraphAbortController: AbortController | undefined;
let activeReferenceGraphOperation: ReferenceGraphOperation | undefined;

class ReferenceGraphOperation {
  private readonly controller = new AbortController();
  private readonly operationId = crypto.randomUUID();
  private readonly workOperation: WorkOperation = createWorkOperation();
  private state: ReferenceGraphOperationState = "created";
  private dataAcquisition: FoblesDataAcquisition | undefined;

  constructor(private readonly doc: Document) {}

  cancel(): void {
    if (this.state === "closed" || this.state === "disposing") {
      return;
    }
    extensionLog.debug("Reference graph operation: cancellation requested", {
      operationId: this.operationId,
      state: this.state,
    });
    this.controller.abort();
    void this.workOperation.cancel();
    closeReferenceGraphProgressModal(this.doc);
  }

  async run(): Promise<void> {
    this.transition("running");
    referenceGraphAbortController = this.controller;
    startReferenceGraphTimer();
    try {
      await this.buildAndDisplayGraph();
    } catch (error) {
      closeReferenceGraphProgressModal(this.doc);
      if (this.controller.signal.aborted) {
        extensionLog.debug("REFERENCE GRAPH: cancelled", { operationId: this.operationId, error });
      } else {
        extensionLog.error("REFERENCE GRAPH: data request failed", { operationId: this.operationId, error });
        showFoblesErrorDialog(this.doc, {
          title: "Reference Graph",
          messagePublicFacing: error instanceof Error ? error.message : "Reference Graph data could not be loaded.",
        });
      }
    } finally {
      await this.close();
    }
  }

  private async buildAndDisplayGraph(): Promise<void> {
    const filters = await getReferenceGraphFilters();
    const graphHolder: { prepared?: PreparedReferenceGraph } = {};
    this.dataAcquisition = await openFoblesDataAcquisition({
      flavor: "reference-model",
      target: "current-object",
      doc: this.doc,
      workOperation: this.workOperation,
      signal: this.controller.signal,
      filters,
      onModelReady: (model) => {
        graphHolder.prepared = addGraphElements(model);
      },
      onAcquireProgress: (step, status) => handleHarvestProgress(this.doc, step, status),
      onHarvestRequired: () => {
        initializeReferenceGraphProgressModal(this.doc, PROGRESS_STEPS, filters);
        openReferenceGraphProgressModal(this.doc, () => this.cancel());
      },
    });
    this.throwIfCancelled();
    if (!this.dataAcquisition || !graphHolder.prepared) {
      throw new Error("The requested data was unavailable.");
    }
    this.transition("displaying");
    closeReferenceGraphProgressModal(this.doc);
    const prepared = graphHolder.prepared;
    await openReferenceGraphUtility(
      this.doc,
      this.workOperation,
      prepared,
      async (link, graphFilters, existingResult) =>
        await harvestGraphForLink(link, this.doc, this.controller, graphFilters, existingResult),
    );
  }

  private throwIfCancelled(): void {
    if (this.controller.signal.aborted) {
      throw new DOMException("Reference Graph cancelled", "AbortError");
    }
  }

  private async close(): Promise<void> {
    if (this.state === "closed" || this.state === "disposing") {
      return;
    }
    this.transition("disposing");
    closeReferenceGraphProgressModal(this.doc);
    this.controller.abort();
    this.dataAcquisition?.dispose();
    await this.workOperation.cancel();
    if (referenceGraphAbortController === this.controller) {
      referenceGraphAbortController = undefined;
    }
    this.transition("closed");
    extensionLog.debug("Reference graph operation: closed", {
      operationId: this.operationId,
      workOperationId: this.workOperation.id,
    });
  }

  private transition(nextState: ReferenceGraphOperationState): void {
    const previousState = this.state;
    this.state = nextState;
    extensionLog.debug("Reference graph operation: state changed", {
      operationId: this.operationId,
      previousState,
      nextState,
    });
  }
}

export async function openReferenceGraph(doc: Document): Promise<void> {
  if (activeReferenceGraphOperation) {
    return;
  }
  const operation = new ReferenceGraphOperation(doc);
  activeReferenceGraphOperation = operation;
  try {
    await operation.run();
  } finally {
    if (activeReferenceGraphOperation === operation) {
      activeReferenceGraphOperation = undefined;
    }
  }
}
