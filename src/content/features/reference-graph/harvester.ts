// @source-path [fobles] src/content/features/reference-graph/harvester.ts

import { extensionLog } from "../../logger";
import { harvestSitecoreWithWorkers } from "../../foundation/harvesting/coordinator/foreground-harvest-coordinator";
import type { SitecoreHarvestResult } from "../../foundation/harvesting/sitecore-harvester.types";
import type { SitecoreHarvestFiltersState } from "../../foundation/harvesting/sitecore-harvester.types";
import { handleHarvestProgress } from "./build-progress";

// Left-clicking a graph node re-roots the SAME open modal at that item, with no page navigation
// in this tab - routes through the same ForegroundHarvestCoordinator as the initial harvest,
// just targeting a different url. existingResult is only supplied for the lazy-filter-enable
// case (see reference-graph-app.tsx); a reroot (event-handlers.ts) omits it, since that's a full
// fresh harvest at the new root item.

export async function harvestGraphForLink(link: string,
  progressDoc: Document,
  referenceGraphAbortController: AbortController | undefined,
  filters: SitecoreHarvestFiltersState,
  existingResult?: SitecoreHarvestResult,
): Promise<SitecoreHarvestResult | undefined> {
  const controller = new AbortController();
  referenceGraphAbortController = controller;
  let result: SitecoreHarvestResult | undefined = undefined;
  try {

    extensionLog.debug(`[${harvestGraphForLink.name}]Reference graph: starting re-harvest for clicked node`, { link });

    result = await harvestSitecoreWithWorkers(
      {
        requestId: crypto.randomUUID(),
        url: link,
        filters,
        existingResult,
      },
      {
        signal: controller.signal,
        onProgress: (step, status) => handleHarvestProgress(progressDoc, step, status),
      },
    );

    extensionLog.debug(`[${harvestGraphForLink.name}]Reference graph: successfully re-harvested for clicked node`, { link, result });

  } catch (error) {
    extensionLog.warn("Reference graph: failed to re-harvest for clicked node", { link, error });
  }
  return result;
}
