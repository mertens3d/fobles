import { REFERENCE_GRAPH } from "../../../constants/graph.const";
import { isHarvestStep, type HarvestProgressStatus, type SitecoreHarvestFiltersState } from "../../sitecore-harvester/sitecore-harvester.types";
import type { HarvestStep } from "../../sitecore-harvester/sitecore-harvester.types";
import type { ProgressStep } from "../../sitecore-harvester/sitecore-harvester.types";

export function initializeReferenceGraphProgressModal(doc: Document, steps: readonly ProgressStep[], filters: SitecoreHarvestFiltersState,): void {
  const buildingMessage = doc.getElementById(REFERENCE_GRAPH.PROGRESS_MESSAGE_ID,);
  if (!buildingMessage) return;
  buildingMessage.replaceChildren(...steps.map((step) => {
    const row = doc.createElement("div");
    row.id = `${REFERENCE_GRAPH.PROGRESS_MESSAGE_ID}-${step.stepKey}`;
    const status =
      isHarvestStep(step) && !filters[step.filterKey]
        ? "skipped"
        : "pending";

    row.textContent =
      status === "skipped"
        ? `○ ${step.label} - Skipped`
        : `○ ${step.label}`;
    return row;
  }),);
}

type HarvestProgressStep =
  Pick<HarvestStep, "stepKey" | "label">;

export function handleHarvestProgress(
  doc: Document,
  step: HarvestProgressStep,
  status: HarvestProgressStatus,
): void {
  if (status === "skipped") {
    updateReferenceGraphProgressModalSkipped(doc, step);
    return;
  }
  updateReferenceGraphProgressModal(doc, step);
}
export function updateReferenceGraphProgressModalSkipped(doc: Document, harvestStep: HarvestProgressStep,): void {
  const row = doc.getElementById(`${REFERENCE_GRAPH.PROGRESS_MESSAGE_ID}-${harvestStep.stepKey}`,);
  if (row) {
    row.textContent = `○ ${harvestStep.label} - Skipped`;
  }
}

export function updateReferenceGraphProgressModal(
  doc: Document,
  buildStep: HarvestProgressStep,
): void {
  const row = doc.getElementById(
    `${REFERENCE_GRAPH.PROGRESS_MESSAGE_ID}-${buildStep.stepKey}`,
  );

  if (row) row.textContent = `✓ ${buildStep.label}`;
}

export function closeReferenceGraphProgressModal(doc: Document): void {
  (doc.getElementById(REFERENCE_GRAPH.PROGRESS_DIALOG_ID) as HTMLDialogElement | undefined)?.close();
}

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