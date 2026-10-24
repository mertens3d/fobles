import { createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { CONST } from "../../../constants/const";
import { subscribeActivity, type ActivityEvent } from "../../shared/activity/activity-events";
import type { HarvestProgressStatus, ProgressStep, SitecoreHarvestFiltersState } from "../../sitecore-harvester/sitecore-harvester.types";
import { ReferenceGraphProgressDialog } from "./components/reference-graph-progress-dialog";

let progressRoot: Root | undefined;
let progressDialog: HTMLDialogElement | undefined;
let progressCancelHandler: (() => void) | undefined;
let unsubscribeActivity: (() => void) | undefined;
let activities: ActivityEvent[] = [];

function renderProgressDialog(): void {
  progressRoot?.render(createElement(ReferenceGraphProgressDialog, { activities, onCancel: () => progressCancelHandler?.() }));
}

function disposeProgressDialog(): void {
  unsubscribeActivity?.(); unsubscribeActivity = undefined;
  progressRoot?.unmount(); progressRoot = undefined;
  progressDialog?.remove(); progressDialog = undefined;
  activities = []; progressCancelHandler = undefined;
}

export function initializeReferenceGraphProgressModal(_doc: Document, _steps: readonly ProgressStep[], _filters: SitecoreHarvestFiltersState): void { renderProgressDialog(); }
export function handleHarvestProgress(_doc: Document, _step: Pick<ProgressStep, "stepKey" | "label">, _status: HarvestProgressStatus): void { /* Legacy compatibility; worker activity is authoritative. */ }
export function updateReferenceGraphProgressModalSkipped(doc: Document, step: Pick<ProgressStep, "stepKey" | "label">): void { handleHarvestProgress(doc, step, "skipped"); }
export function updateReferenceGraphProgressModal(doc: Document, step: Pick<ProgressStep, "stepKey" | "label">): void { handleHarvestProgress(doc, step, "complete"); }
export function closeReferenceGraphProgressModal(_doc: Document): void { if (progressDialog?.open) progressDialog.close(); else disposeProgressDialog(); }

export function openReferenceGraphProgressModal(doc: Document, onCancel: () => void): void {
  disposeProgressDialog();
  const dialog = doc.createElement("dialog");
  const reactHost = doc.createElement("div");
  dialog.id = CONST.FOBLES.REFERENCE_GRAPH.DOM.IDS.PROGRESS_DIALOG_ID;
  dialog.className = "fobles-reference-graph-progress";
  dialog.appendChild(reactHost); doc.body.appendChild(dialog);
  progressDialog = dialog; progressRoot = createRoot(reactHost); progressCancelHandler = onCancel; activities = [];
  unsubscribeActivity = subscribeActivity((activity) => {
    const existing = activities.findIndex((item) => item.activityId === activity.activityId);
    activities = existing < 0 ? [...activities, activity] : activities.map((item, index) => index === existing ? activity : item);
    renderProgressDialog();
  });
  dialog.addEventListener("close", disposeProgressDialog, { once: true });
  dialog.addEventListener("cancel", (event) => event.preventDefault());
  renderProgressDialog(); dialog.showModal();
}
