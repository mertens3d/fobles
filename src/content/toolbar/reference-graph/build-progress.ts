// @source-path [fobles] src/content/toolbar/reference-graph/build-progress.ts

import { createElement } from "react";
import { createRoot, type Root } from "react-dom/client";

import {
    isHarvestStep,
    type HarvestProgressStatus,
    type ProgressStep,
    type SitecoreHarvestFiltersState,
} from "../../sitecore-harvester/sitecore-harvester.types";
import {
    ReferenceGraphProgressDialog,
    type ProgressItem,
} from "./components/reference-graph-progress-dialog";
import { CONST } from "../../../constants/const";

let progressRoot: Root | undefined;
let progressDialog: HTMLDialogElement | undefined;
let progressSteps: ProgressItem[] = [];
let progressCancelHandler: (() => void) | undefined;

function renderProgressDialog(): void {
    progressRoot?.render(
        createElement(ReferenceGraphProgressDialog, {
            steps: progressSteps,
            onCancel: () => {
                progressCancelHandler?.();
            },
        }),
    );
}

function disposeProgressDialog(): void {
    progressRoot?.unmount();
    progressRoot = undefined;

    progressDialog?.remove();
    progressDialog = undefined;

    progressSteps = [];
    progressCancelHandler = undefined;
}

export function initializeReferenceGraphProgressModal(
    _doc: Document,
    steps: readonly ProgressStep[],
    filters: SitecoreHarvestFiltersState,
): void {
    progressSteps = steps.map((step): ProgressItem => ({
        ...step,
        status:
            isHarvestStep(step) && !filters[step.filterKey]
                ? "skipped"
                : "pending",
    }));

    renderProgressDialog();
}

export function handleHarvestProgress(
    _doc: Document,
    step: Pick<ProgressStep, "stepKey" | "label">,
    status: HarvestProgressStatus,
): void {
    const existingStepIndex = progressSteps.findIndex(
        (progressStep) =>
            progressStep.stepKey === step.stepKey,
    );

    if (existingStepIndex === -1) {
        progressSteps = [
            ...progressSteps,
            {
                ...step,
                status,
            },
        ];
    } else {
        progressSteps = progressSteps.map(
            (progressStep, index) =>
                index === existingStepIndex
                    ? {
                          ...progressStep,
                          label: step.label,
                          status,
                      }
                    : progressStep,
        );
    }

    renderProgressDialog();
}

export function updateReferenceGraphProgressModalSkipped(
    doc: Document,
    step: Pick<ProgressStep, "stepKey" | "label">,
): void {
    handleHarvestProgress(doc, step, "skipped");
}

export function updateReferenceGraphProgressModal(
    doc: Document,
    step: Pick<ProgressStep, "stepKey" | "label">,
): void {
    handleHarvestProgress(doc, step, "complete");
}

export function closeReferenceGraphProgressModal(
    _doc: Document,
): void {
    if (progressDialog?.open) {
        progressDialog.close();
    } else {
        disposeProgressDialog();
    }
}

export function openReferenceGraphProgressModal(
    doc: Document,
    onCancel: () => void,
): void {
    disposeProgressDialog();

    const dialog = doc.createElement("dialog");
    const reactHost = doc.createElement("div");

    dialog.id = CONST.FOBLES.REFERENCE_GRAPH.PROGRESS_DIALOG_ID;
    dialog.className = "fobles-reference-graph-progress";

    dialog.appendChild(reactHost);
    doc.body.appendChild(dialog);

    progressDialog = dialog;
    progressRoot = createRoot(reactHost);
    progressCancelHandler = onCancel;
    progressSteps = [];

    dialog.addEventListener(
        "close",
        () => {
            disposeProgressDialog();
        },
        { once: true },
    );

    dialog.addEventListener("click", (event) => {
        if (event.target === dialog) {
            progressCancelHandler?.();
        }
    });

    renderProgressDialog();
    dialog.showModal();
}