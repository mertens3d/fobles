// @source-path [fobles] src/shared/error-dialog.ts

import type { FoblesCleanupProgress } from "./FoblesCleanupProgress.types";
import type { FoblesMessageDialogOptions, FoblesErrorDialogOptions } from "./FoblesMessageDialogOptions.types";
import { FOBLES_ERROR_DIALOG_ID, FOBLES_CLEANUP_DIALOG_ID } from "./shared.const";
import { CLEANUP_PROGRESS_ATTRIBUTE } from "./shared.const";

function showFoblesMessageDialog(
  doc: Document,
  { id, title, messagePublicFacing, className }: FoblesMessageDialogOptions,
): HTMLDialogElement {
  doc.getElementById(id)?.remove();
  const dialog = doc.createElement("dialog");
  const heading = doc.createElement("h2");
  const body = doc.createElement("div");
  const closeButton = doc.createElement("button");
  dialog.id = id;
  dialog.className = ["fobles-error-dialog", className].filter(Boolean).join(" ");
  dialog.setAttribute("aria-labelledby", `${id}-title`);
  dialog.setAttribute("aria-describedby", `${id}-message`);
  heading.id = `${id}-title`;
  heading.className = "fobles-error-dialog__title";
  heading.textContent = title;
  body.id = `${id}-message`;
  body.className = "fobles-error-dialog__message";
  body.innerHTML = messagePublicFacing;
  closeButton.type = "button";
  closeButton.className = "fobles-error-dialog__close";
  closeButton.textContent = "Close";
  closeButton.addEventListener("click", () => dialog.close());
  dialog.addEventListener("close", () => dialog.remove(), { once: true });
  dialog.append(heading, body, closeButton);
  doc.body.appendChild(dialog);
  dialog.showModal();
  return dialog;
}

export function showFoblesErrorDialog(
  doc: Document,
  { title, messagePublicFacing }: FoblesErrorDialogOptions,
): HTMLDialogElement {
  return showFoblesMessageDialog(doc, { id: FOBLES_ERROR_DIALOG_ID, title, messagePublicFacing });
}

export function showFoblesCleanupDialog(doc: Document): HTMLDialogElement {
  const dialog = showFoblesMessageDialog(doc, {
    id: FOBLES_CLEANUP_DIALOG_ID,
    title: "Cleaning up, please wait",
    messagePublicFacing:
      '<div data-fobles-cleanup-progress>Preparing cleanup...</div><progress class="fobles-cleanup-dialog__progress" max="1" value="0"></progress>',
    className: "fobles-cleanup-dialog",
  });
  const closeButton = dialog.querySelector<HTMLButtonElement>(".fobles-error-dialog__close");
  if (closeButton) {
    closeButton.hidden = true;
  }
  return dialog;
}

export function updateFoblesCleanupDialog(doc: Document, progress: FoblesCleanupProgress): void {
  const dialog = doc.getElementById(FOBLES_CLEANUP_DIALOG_ID);
  if (!(dialog instanceof HTMLDialogElement)) {
    return;
  }
  const message = dialog.querySelector<HTMLElement>(`[${CLEANUP_PROGRESS_ATTRIBUTE}]`);
  const progressBar = dialog.querySelector<HTMLProgressElement>(".fobles-cleanup-dialog__progress");
  const safeTotal = Math.max(progress.total, 1);
  if (message) {
    const status =
      progress.phase === "failsafe"
        ? "Running final cleanup"
        : progress.phase === "complete"
          ? "Cleanup complete"
          : "Cleaning up";
    message.textContent =
      `${status}. ${progress.removed} / ${progress.total} worker iframe${progress.total === 1 ? "" : "s"} removed. ${progress.remainingSeconds > 0 ? `Waiting a maximum of ${progress.remainingSeconds} second${progress.remainingSeconds === 1 ? "" : "s"} more.` : ""}`.trim();
  }
  if (progressBar) {
    progressBar.max = safeTotal;
    progressBar.value =
      progress.total === 0 && progress.phase === "complete" ? 1 : Math.min(progress.removed, safeTotal);
  }
  if (progress.phase === "complete") {
    setTimeout(() => {
      if (dialog.isConnected) {
        dialog.close();
      }
    }, 250);
  }
}
