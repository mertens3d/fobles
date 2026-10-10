import { REFERENCE_GRAPH } from "../../../constants/graph.const";
import type { HarvestStatus, SitecoreHarvestFiltersState } from "../../sitecore-harvester/sitecore-harvester.types";
import type { HarvestStep } from "../../sitecore-harvester/sitecore-harvester.types";

//   let completedSteps = 0;

// export const reportProgress = (progressDoc: Document, buildStep: BuildStep): void => {
//     completedSteps += 1;
//     updateReferenceGraphProgressModal(progressDoc, buildStep);
//   };
// Not a real percentage of actual work remaining (no good way to know that upfront) - just a
// ticking counter so the user can see something is genuinely progressing, not hung.

// export function updateReferenceGraphProgressModal(doc: Document, completedSteps: number, total: number): void {
//   const buildingMessage = doc.getElementById(REFERENCE_GRAPH.PROGRESS_MESSAGE_ID);
//   if (buildingMessage) buildingMessage.textContent = `${REFERENCE_GRAPH.TEXT.BUILDING_REFERENCE_GRAPH} (${completedSteps}/${total})`;
// }

export function initializeReferenceGraphProgressModal(doc: Document, buildSteps: readonly HarvestStep[], filters: SitecoreHarvestFiltersState,): void {
  const buildingMessage = doc.getElementById(REFERENCE_GRAPH.PROGRESS_MESSAGE_ID,);
  if (!buildingMessage) return;
  buildingMessage.replaceChildren(...buildSteps.map((step) => {
    const row = doc.createElement("div");
    row.id = `${REFERENCE_GRAPH.PROGRESS_MESSAGE_ID}-${step.harvestStepKey}`;
    row.textContent = filters[step.filterKey] ? `○ ${step.label}` : `○ ${step.label} - Skipped`;
    return row;
  }),);
}

type HarvestProgressStep =
  Pick<HarvestStep, "harvestStepKey" | "label">;

export function handleHarvestProgress(
  doc: Document,
  step: HarvestProgressStep,
  status: HarvestStatus,
): void {
  if (status === "skipped") {
    updateReferenceGraphProgressModalSkipped(doc, step);
    return;
  }
  updateReferenceGraphProgressModal(doc, step);
}
export function updateReferenceGraphProgressModalSkipped(doc: Document, harvestStep: HarvestProgressStep,): void {
  const row = doc.getElementById(`${REFERENCE_GRAPH.PROGRESS_MESSAGE_ID}-${harvestStep.harvestStepKey}`,);
  if (row) {
    row.textContent = `○ ${harvestStep.label} - Skipped`;
  }
}

export function updateReferenceGraphProgressModal(
  doc: Document,
  buildStep: HarvestProgressStep,
): void {
  const row = doc.getElementById(
    `${REFERENCE_GRAPH.PROGRESS_MESSAGE_ID}-${buildStep.harvestStepKey}`,
  );

  if (row) row.textContent = `✓ ${buildStep.label}`;
}

export function closeReferenceGraphProgressModal(doc: Document): void {
  (doc.getElementById(REFERENCE_GRAPH.PROGRESS_DIALOG_ID) as HTMLDialogElement | undefined)?.close();
}

// Shown immediately on click (and again on every reload the toggle-enable/restore sequence
// triggers), since harvesting involves a fetch per rendering plus possibly a couple of page
// reloads - a singleton dialog so re-showing it on each reload just replaces the last one.
export function openReferenceGraphProgressModal(doc: Document, onCancel: () => void): void {
  closeReferenceGraphProgressModal(doc);

  const dialog = doc.createElement("dialog");
  dialog.id = REFERENCE_GRAPH.PROGRESS_DIALOG_ID;
  dialog.style.cssText =
    "padding:24px 32px;border:none;border-radius:4px;text-align:center;font-family:sans-serif;";

  const buildingMessage = doc.createElement("p");
  buildingMessage.id = REFERENCE_GRAPH.PROGRESS_MESSAGE_ID;
  buildingMessage.textContent = REFERENCE_GRAPH.TEXT.BUILDING_REFERENCE_GRAPH;
  buildingMessage.style.cssText = "margin:0 0 16px;";

  const cancelButton = doc.createElement("button");
  cancelButton.type = "button";
  cancelButton.textContent = "Cancel";
  cancelButton.addEventListener("click", onCancel);

  dialog.append(buildingMessage, cancelButton);
  doc.body.appendChild(dialog);
  dialog.addEventListener("close", () => dialog.remove());
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) onCancel();
  });
  dialog.showModal();
}