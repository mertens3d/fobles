// @source-path [fobles] src/content/features/auditor/auditor-grid/auditor-group-load-state.ts

import type { SitecoreHarvestResult } from "../../../foundation/harvesting/harvesting.types";
import type { ReferenceModelBranch } from "../../../foundation/reference-data/model/model.types";
import type { AuditorGroupLoadState, AuditorGroupStatusContext } from "./auditor-grid.types";

// Agent: The root harvest stores every list fact as an array once it has arrived ([] when there is nothing), and
// Agent: leaves it undefined until then. That is the only signal that separates "not known yet" from "none".
function harvestedValue(harvest: SitecoreHarvestResult, branch: ReferenceModelBranch): readonly unknown[] | undefined {
  const valueByBranch: Partial<Record<ReferenceModelBranch, readonly unknown[] | undefined>> = {
    children: harvest.childItems,
    customFields: harvest.customFieldSections,
    layouts: harvest.layoutSectionFields,
    referrers: harvest.referrers,
    standardFields: harvest.standardFieldSections,
  };
  return valueByBranch[branch];
}

function hasAnyLayoutDevice(harvest: SitecoreHarvestResult): boolean {
  return (harvest.layoutSectionFields ?? []).some((section) => section.devices.length > 0);
}

// Agent: Parent is a single optional item, so undefined cannot tell "not loaded" from "no parent". Callers decide
// Agent: parent from whether its row exists; this function only covers list-shaped branches.
export function resolveBranchLoadState(
  branch: ReferenceModelBranch,
  { rootHarvest, settled }: AuditorGroupStatusContext,
): AuditorGroupLoadState {
  const value = harvestedValue(rootHarvest, branch);
  const arrivedState: AuditorGroupLoadState =
    branch === "layouts" && !hasAnyLayoutDevice(rootHarvest) ? "not-applicable" : "complete";
  const missingState: AuditorGroupLoadState = settled ? "failed" : "auditing";

  return value === undefined ? missingState : arrivedState;
}
