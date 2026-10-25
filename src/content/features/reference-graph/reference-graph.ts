// @source-path [fobles] src/content/features/reference-graph/reference-graph.ts
import type { SitecoreHarvestFiltersState } from "../../sitecore-harvester/sitecore-harvester.types";
import { buildFoblesUrl } from "../augmentor/helper";
import { getReferenceGraphFilters } from "../../../shared/reference-graph-settings";
import { extensionLog } from "../../logger";
import { PROGRESS_STEPS } from "../../sitecore-harvester/planner/harvest-steps";
import { harvestSitecoreWithWorkers } from "../../sitecore-harvester/coordinator/foreground-harvest-coordinator";
import { createWorkSession } from "../../shell/work-session/work-session";
import type { WorkSession } from "../../shell/work-session/work-session.types";
import { closeReferenceGraphProgressModal, handleHarvestProgress, initializeReferenceGraphProgressModal, openReferenceGraphProgressModal } from "./build-progress";
import { harvestGraphForLink } from "./harvester";
import { openReferenceGraphModal } from "./reference-graph-modal";
import { acquireReferenceGraphSessionLock, releaseReferenceGraphSessionLock } from "./reference-graph-session-lock";
import { startReferenceGraphTimer } from "./reference-graph-timing";
import { showFoblesErrorDialog } from "../../../shared/error-dialog";
import { createReferenceGraphSessionContainer, removeReferenceGraphSessionContainer } from "./reference-graph-session-container";
import { acquireReferenceModelForCurrentItem } from "./lifecycle/acquire-reference-model";
import { setActiveHarvestQueue, publishHarvestQueueProgress } from "./lifecycle/active-harvest-queue";
import { createHarvestQueue, type HarvestQueue } from "./lifecycle/harvest-queue";
import { publishRootRefresh } from "./lifecycle/root-refresh-events";
export let referenceGraphAbortController: AbortController | undefined;
let activeReferenceGraphSession: ReferenceGraphSession | undefined;
type ReferenceGraphSessionState = "created" | "running" | "restoring" | "displaying" | "disposing" | "closed";
class ReferenceGraphSession {
  private readonly controller = new AbortController();
  private readonly sessionId = crypto.randomUUID();
  private readonly workSession: WorkSession = createWorkSession();
  private state: ReferenceGraphSessionState = "created";
  private harvestQueue: HarvestQueue | undefined;
  constructor(private readonly doc: Document) {}
  cancel(): void { if (this.state === "closed" || this.state === "disposing") return; extensionLog.debug("Reference graph session: cancellation requested", { sessionId: this.sessionId, state: this.state }); this.controller.abort(); void this.workSession.cancel(); closeReferenceGraphProgressModal(this.doc); }
  async run(): Promise<void> { this.transition("running"); createReferenceGraphSessionContainer(this.doc, this.sessionId); referenceGraphAbortController = this.controller; startReferenceGraphTimer(); try { await this.buildAndDisplayGraph(); } catch (error) { closeReferenceGraphProgressModal(this.doc); if (this.controller.signal.aborted) extensionLog.debug("REFERENCE GRAPH: cancelled", { sessionId: this.sessionId, error }); else { extensionLog.error("REFERENCE GRAPH: harvest or graph preparation failed", { sessionId: this.sessionId, error }); showFoblesErrorDialog(this.doc, { title: "Reference Graph", messagePublicFacing: error instanceof Error ? error.message : "Something has gone wrong while building the Reference Graph." }); } } finally { await this.close(); } }
  private async buildAndDisplayGraph(): Promise<void> {
    const filters = await getReferenceGraphFilters();
    const acquired = await acquireReferenceModelForCurrentItem(this.doc, filters, { signal: this.controller.signal, onProgress: (step, status) => handleHarvestProgress(this.doc, step, status), onHarvestRequired: () => { initializeReferenceGraphProgressModal(this.doc, PROGRESS_STEPS, filters); openReferenceGraphProgressModal(this.doc, () => this.cancel()); } });
    this.transition("restoring"); this.throwIfCancelled(); if (!acquired) throw new Error("Something has gone wrong. The Reference Graph harvest returned no graph.");
    const { itemId, prepared: preparedGraph, decision } = acquired; this.transition("displaying"); closeReferenceGraphProgressModal(this.doc);
    this.harvestQueue = createHarvestQueue({ runHarvest: (reference, signal) => this.runBackgroundHarvest(reference, filters, signal), onProgress: publishHarvestQueueProgress, onError: (reference, error) => extensionLog.warn("Reference graph harvest queue: item failed", { sessionId: this.sessionId, reference, error }) });
    setActiveHarvestQueue(this.harvestQueue); if (decision.kind === "cache-then-reharvest") this.harvestQueue.enqueue(itemId);
    await openReferenceGraphModal(this.doc, this.workSession, preparedGraph, async (link, graphFilters, existingResult) => await harvestGraphForLink(link, this.doc, this.controller, graphFilters, existingResult));
  }
  private async runBackgroundHarvest(reference: string, filters: SitecoreHarvestFiltersState, signal: AbortSignal): Promise<void> { const result = await harvestSitecoreWithWorkers({ requestId: this.workSession.id, url: buildFoblesUrl(reference), filters }, { signal }); if (result) { extensionLog.debug("Reference graph: background re-harvest complete", { sessionId: this.sessionId, reference, rootItemId: result.rootItem.scItemId }); publishRootRefresh(result.rootItem.scItemId, result); } }
  private throwIfCancelled(): void { if (this.controller.signal.aborted) throw new DOMException("Reference Graph cancelled", "AbortError"); }
  private async close(): Promise<void> {
    if (this.state === "closed" || this.state === "disposing") return;
    this.transition("disposing");
    closeReferenceGraphProgressModal(this.doc);
    this.controller.abort();
    this.harvestQueue?.dispose();
    setActiveHarvestQueue(undefined);
    await this.workSession.cancel();
    removeReferenceGraphSessionContainer(this.doc, this.sessionId);
    if (referenceGraphAbortController === this.controller) referenceGraphAbortController = undefined;
    this.transition("closed");
    extensionLog.debug("Reference graph session: closed", { sessionId: this.sessionId, workSessionId: this.workSession.id });
  }
  private transition(nextState: ReferenceGraphSessionState): void { const previousState = this.state; this.state = nextState; extensionLog.debug("Reference graph session: state changed", { sessionId: this.sessionId, previousState, nextState }); }
}
export async function openReferenceGraph(doc: Document): Promise<void> { if (activeReferenceGraphSession) return; const acquired = await acquireReferenceGraphSessionLock(); if (!acquired) { showFoblesErrorDialog(doc, { title: "Reference Graph Already Active", messagePublicFacing: "Only one Reference Graph or Auditor can be active in this browser session. Close the active Fobles specialist tool first." }); return; } const session = new ReferenceGraphSession(doc); activeReferenceGraphSession = session; try { await session.run(); } finally { if (activeReferenceGraphSession === session) activeReferenceGraphSession = undefined; await releaseReferenceGraphSessionLock(); } }
