// @source-path [fobles] src/content/features/reference-graph/reference-graph.ts

import type { ReferenceGraphOperationState } from "./reference-graph.types.js";
import { getReferenceGraphFilters } from "../../../shared/reference-graph-settings";
import { openFoblesDataAcquisition } from "../../foundation/reference-data/reference-data-acquisition";
import type { FoblesDataAcquisition } from "../../foundation/reference-data/reference-data.types";
import type { WorkOperation } from "../../foundation/workers/operation/work-operation.types";
import { WORK_PROGRESS } from "../../foundation/workers/progress/work-progress.const";
import { extensionLog } from "../../logger";
import { openReferenceGraphUtility } from "../../shell/utility/fobles-utility-launchers";
import { createWorkOperation } from "../../shell/work-operation/work-operation";
import { harvestGraphForLink } from "./harvester";
import { addGraphElements } from "./prepared-reference-graph";
import type { PreparedReferenceGraph, ReferenceGraphLoading } from "./reference-graph.types";
import { createReferenceGraphLoading } from "./reference-graph-loading";
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
  }

  async run(): Promise<void> {
    this.transition("running");
    referenceGraphAbortController = this.controller;
    startReferenceGraphTimer();
    try {
      await this.buildAndDisplayGraph();
    } catch (error) {
      extensionLog.error("REFERENCE GRAPH: operation failed", { operationId: this.operationId, error });
    } finally {
      await this.close();
    }
  }

  // Agent: Like the Auditor, the Graph window opens immediately and shows the work session's progress while the
  // Agent: Reference Model is acquired. Closing the window (or failing to open it) cancels the operation.
  private async buildAndDisplayGraph(): Promise<void> {
    this.workOperation.describe({ title: WORK_PROGRESS.TITLE.GRAPH });
    const filters = await getReferenceGraphFilters();
    const loading = createReferenceGraphLoading();
    const windowClosed = openReferenceGraphUtility(
      this.doc,
      this.workOperation,
      loading,
      async (link, graphFilters, existingResult) =>
        await harvestGraphForLink(link, this.workOperation, graphFilters, existingResult),
    );
    void windowClosed.then(() => this.cancel());
    await this.acquireGraph(filters, loading);
    await windowClosed;
  }

  private async acquireGraph(
    filters: Awaited<ReturnType<typeof getReferenceGraphFilters>>,
    loading: ReferenceGraphLoading,
  ): Promise<void> {
    const graphHolder: { prepared?: PreparedReferenceGraph } = {};
    try {
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
      });
      this.throwIfCancelled();
      if (!this.dataAcquisition || !graphHolder.prepared) {
        throw new Error("The requested data was unavailable.");
      }
      this.transition("displaying");
      loading.resolve(graphHolder.prepared);
    } catch (error) {
      this.reportAcquisitionFailure(error, loading);
    }
  }

  private reportAcquisitionFailure(error: unknown, loading: ReferenceGraphLoading): void {
    if (this.controller.signal.aborted) {
      extensionLog.debug("REFERENCE GRAPH: cancelled", { operationId: this.operationId, error });
    } else {
      extensionLog.error("REFERENCE GRAPH: data request failed", { operationId: this.operationId, error });
      loading.fail(error instanceof Error ? error.message : "Reference Graph data could not be loaded.");
    }
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
