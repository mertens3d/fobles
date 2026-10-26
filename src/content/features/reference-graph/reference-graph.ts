// @source-path [fobles] src/content/features/reference-graph/reference-graph.ts

import { extensionLog } from "../../logger";
import { createWorkSession } from "../../shell/work-session/work-session";
import type { WorkSession } from "../../shell/work-session/work-session.types";
import { getReferenceGraphFilters } from "../../../shared/reference-graph-settings";
import { PROGRESS_STEPS } from "../../foundation/harvesting/planner/harvest-steps";
import { openFoblesDataSession, type FoblesDataSession } from "../../shared/data/fobles-data-service";
import {
  closeReferenceGraphProgressModal,
  handleHarvestProgress,
  initializeReferenceGraphProgressModal,
  openReferenceGraphProgressModal,
} from "./build-progress";
import { harvestGraphForLink } from "./harvester";
import { openReferenceGraphModal } from "./reference-graph-modal";
import { acquireReferenceGraphSessionLock, releaseReferenceGraphSessionLock } from "./reference-graph-session-lock";
import { startReferenceGraphTimer } from "./reference-graph-timing";
import { showFoblesErrorDialog } from "../../../shared/error-dialog";
import { createReferenceGraphSessionContainer, removeReferenceGraphSessionContainer } from "./reference-graph-session-container";

export let referenceGraphAbortController: AbortController | undefined;

let activeReferenceGraphSession: ReferenceGraphSession | undefined;

type ReferenceGraphSessionState = "created" | "running" | "displaying" | "disposing" | "closed";

class ReferenceGraphSession {
  private readonly controller = new AbortController();
  private readonly sessionId = crypto.randomUUID();
  private readonly workSession: WorkSession = createWorkSession();
  private state: ReferenceGraphSessionState = "created";
  private dataSession: FoblesDataSession | undefined;

  constructor(private readonly doc: Document) {}

  cancel(): void {
    if (this.state === "closed" || this.state === "disposing") return;

    extensionLog.debug("Reference graph session: cancellation requested", { sessionId: this.sessionId, state: this.state });
    this.controller.abort();
    void this.workSession.cancel();
    closeReferenceGraphProgressModal(this.doc);
  }

  async run(): Promise<void> {
    this.transition("running");
    createReferenceGraphSessionContainer(this.doc, this.sessionId);
    referenceGraphAbortController = this.controller;
    startReferenceGraphTimer();

    try {
      await this.buildAndDisplayGraph();
    } catch (error) {
      closeReferenceGraphProgressModal(this.doc);

      if (this.controller.signal.aborted) {
        extensionLog.debug("REFERENCE GRAPH: cancelled", { sessionId: this.sessionId, error });
      } else {
        extensionLog.error("REFERENCE GRAPH: data request failed", { sessionId: this.sessionId, error });
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

    // The step-by-step progress dialog is only for a cold item: it opens right before a live harvest begins and is
    // fed by the data service's acquisition callbacks. A cache-served item never opens it.
    this.dataSession = await openFoblesDataSession({
      flavor: "reference-model",
      target: "current-object",
      doc: this.doc,
      workSession: this.workSession,
      signal: this.controller.signal,
      filters,
      onAcquireProgress: (step, status) => handleHarvestProgress(this.doc, step, status),
      onHarvestRequired: () => {
        initializeReferenceGraphProgressModal(this.doc, PROGRESS_STEPS, filters);
        openReferenceGraphProgressModal(this.doc, () => this.cancel());
      },
    });

    this.throwIfCancelled();

    if (!this.dataSession) throw new Error("The requested data was unavailable.");

    this.transition("displaying");
    closeReferenceGraphProgressModal(this.doc);

    const prepared = this.dataSession.data.model;

    await openReferenceGraphModal(
      this.doc,
      this.workSession,
      prepared,
      async (link, graphFilters, existingResult) => await harvestGraphForLink(link, this.doc, this.controller, graphFilters, existingResult),
    );
  }

  private throwIfCancelled(): void {
    if (this.controller.signal.aborted) throw new DOMException("Reference Graph cancelled", "AbortError");
  }

  private async close(): Promise<void> {
    if (this.state === "closed" || this.state === "disposing") return;

    this.transition("disposing");
    closeReferenceGraphProgressModal(this.doc);
    this.controller.abort();
    this.dataSession?.dispose();
    await this.workSession.cancel();
    removeReferenceGraphSessionContainer(this.doc, this.sessionId);

    if (referenceGraphAbortController === this.controller) referenceGraphAbortController = undefined;

    this.transition("closed");
    extensionLog.debug("Reference graph session: closed", { sessionId: this.sessionId, workSessionId: this.workSession.id });
  }

  private transition(nextState: ReferenceGraphSessionState): void {
    const previousState = this.state;

    this.state = nextState;
    extensionLog.debug("Reference graph session: state changed", { sessionId: this.sessionId, previousState, nextState });
  }
}

export async function openReferenceGraph(doc: Document): Promise<void> {
  if (activeReferenceGraphSession) return;

  const acquired = await acquireReferenceGraphSessionLock();

  if (!acquired) {
    showFoblesErrorDialog(doc, {
      title: "Reference Graph Already Active",
      messagePublicFacing: "Only one Reference Graph or Auditor can be active in this browser session. Close the active Fobles specialist tool first.",
    });

    return;
  }

  const session = new ReferenceGraphSession(doc);

  activeReferenceGraphSession = session;

  try {
    await session.run();
  } finally {
    if (activeReferenceGraphSession === session) activeReferenceGraphSession = undefined;

    await releaseReferenceGraphSessionLock();
  }
}
