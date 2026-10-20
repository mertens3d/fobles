export const FOBLES_ERROR_DIALOG_ID = "fobles-error-dialog";

type FoblesErrorDialogOptions = {
  title: string;
  message: string;
};

export function showFoblesErrorDialog(
  doc: Document,
  { title, message }: FoblesErrorDialogOptions,
): HTMLDialogElement {
  doc.getElementById(FOBLES_ERROR_DIALOG_ID)?.remove();

  const dialog = doc.createElement("dialog");
  const heading = doc.createElement("h2");
  const body = doc.createElement("p");
  const closeButton = doc.createElement("button");

  dialog.id = FOBLES_ERROR_DIALOG_ID;
  dialog.className = "fobles-error-dialog";
  dialog.setAttribute("aria-labelledby", `${FOBLES_ERROR_DIALOG_ID}-title`);
  dialog.setAttribute("aria-describedby", `${FOBLES_ERROR_DIALOG_ID}-message`);

  heading.id = `${FOBLES_ERROR_DIALOG_ID}-title`;
  heading.className = "fobles-error-dialog__title";
  heading.textContent = title;

  body.id = `${FOBLES_ERROR_DIALOG_ID}-message`;
  body.className = "fobles-error-dialog__message";
  body.textContent = message;

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