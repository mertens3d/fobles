// @source-path [fobles] src/shared/error-dialog.ts
export const FOBLES_ERROR_DIALOG_ID = "fobles-error-dialog";
export const FOBLES_CLEANUP_DIALOG_ID = "fobles-cleanup-dialog";
type FoblesMessageDialogOptions = { id: string; title: string; messagePublicFacing: string; };
type FoblesErrorDialogOptions = { title: string; messagePublicFacing: string; };
function showFoblesMessageDialog(doc: Document, { id, title, messagePublicFacing }: FoblesMessageDialogOptions): HTMLDialogElement {
  doc.getElementById(id)?.remove();
  const dialog = doc.createElement("dialog");
  const heading = doc.createElement("h2");
  const body = doc.createElement("div");
  const closeButton = doc.createElement("button");
  dialog.id = id;
  dialog.className = "fobles-error-dialog";
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
export function showFoblesErrorDialog(doc: Document, { title, messagePublicFacing }: FoblesErrorDialogOptions): HTMLDialogElement {
  return showFoblesMessageDialog(doc, { id: FOBLES_ERROR_DIALOG_ID, title, messagePublicFacing });
}
export function showFoblesCleanupDialog(doc: Document): HTMLDialogElement {
  return showFoblesMessageDialog(doc, { id: FOBLES_CLEANUP_DIALOG_ID, title: "Cleaning Up, please wait", messagePublicFacing: "Fobles is cleaning up background workers and temporary resources." });
}
