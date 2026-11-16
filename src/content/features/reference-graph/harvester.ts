// @source-path [fobles] src/content/features/reference-graph/harvester.ts

import { extensionLog } from "../../logger";
import { harvestSitecoreWithWorkers } from "../../foundation/harvesting/coordinator/foreground-harvest-coordinator";
import type { HarvestProgressStatus, SitecoreHarvestResult } from "../../foundation/harvesting/harvesting.types";
import { PROGRESS_STEPS } from "../../foundation/harvesting/planner/harvest-steps";
import { WORK_PROGRESS } from "../../foundation/workers/progress/work-progress.const";
import type { WorkSession } from "../../foundation/workers/session/work-session.types";
import type { SitecoreHarvestFiltersState } from "../../../constants/_base/_base.types";

// Left-clicking a graph node re-roots the SAME open modal at that item, with no page navigation
// in this tab - routes through the same ForegroundHarvestCoordinator as the initial harvest,
// just targeting a different url. existingResult is only supplied for the lazy-filter-enable
// case (see reference-graph-app.tsx); a reroot (event-handlers.ts) omits it, since that's a full
// fresh harvest at the new root item.

// Agent: The harvest runs under its own request id but belongs to the Graph's work session: the session counts its
// Agent: steps as the "link harvest" phase, attributes its frame tasks, and cancels it when the Graph closes.
function createLinkHarvestReporter(
  workSession: WorkSession,
): (stepKey: string, status: HarvestProgressStatus) => void {
  const statusByStepKey = new Map<string, HarvestProgressStatus>();
  const report = (finished: boolean): void => {
    const settled = Array.from(statusByStepKey.values()).filter(
      (status) => status === "complete" || status === "skipped",
    );
    workSession.reportProgress(WORK_PROGRESS.PHASE.LINK_HARVEST, {
      completed: finished ? PROGRESS_STEPS.length : Math.min(settled.length, PROGRESS_STEPS.length),
      max: PROGRESS_STEPS.length,
      status: finished ? "complete" : "running",
    });
  };
  report(false);
  return (stepKey, status) => {
    statusByStepKey.set(stepKey, status);
    report(stepKey === WORK_PROGRESS.LINK_HARVEST_FINISHED);
  };
}

export async function harvestGraphForLink(
  link: string,
  workSession: WorkSession,
  filters: SitecoreHarvestFiltersState,
  existingResult?: SitecoreHarvestResult,
): Promise<SitecoreHarvestResult | undefined> {
  const requestId = crypto.randomUUID();
  const reportStep = createLinkHarvestReporter(workSession);
  let result: SitecoreHarvestResult | undefined = undefined;
  workSession.attachRequest(requestId);
  try {
    extensionLog.debug(`[${harvestGraphForLink.name}]Reference graph: starting re-harvest for clicked node`, { link });

    result = await harvestSitecoreWithWorkers(
      { requestId, url: link, filters, existingResult },
      { signal: workSession.signal, onProgress: (step, status) => reportStep(step.stepKey, status) },
    );

    extensionLog.debug(`[${harvestGraphForLink.name}]Reference graph: successfully re-harvested for clicked node`, {
      link,
      result,
    });
  } catch (error) {
    extensionLog.warn("Reference graph: failed to re-harvest for clicked node", { link, error });
  } finally {
    reportStep(WORK_PROGRESS.LINK_HARVEST_FINISHED, "complete");
  }
  return result;
}
