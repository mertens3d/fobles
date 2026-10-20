// @source-path [fobles] src/content/shared/error-dialog.ts

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
  dialog.style.cssText = [
    "max-width:520px",
    "padding:24px",
    "border:1px solid #9b1c1c",
    "border-radius:6px",
    "background:#ffffff",
    "color:#203047",
    "box-shadow:0 12px 36px rgba(0,0,0,0.35)",
  ].join(";");

  heading.id = `${FOBLES_ERROR_DIALOG_ID}-title`;
  heading.textContent = title;
  heading.style.cssText = "margin:0 0 12px;font:600 20px/1.3 Arial,sans-serif;color:#9b1c1c";

  body.id = `${FOBLES_ERROR_DIALOG_ID}-message`;
  body.textContent = message;
  body.style.cssText = "margin:0 0 20px;font:14px/1.5 Arial,sans-serif;white-space:pre-wrap";

  closeButton.type = "button";
  closeButton.textContent = "Close";
  closeButton.style.cssText = [
    "padding:7px 18px",
    "border:1px solid #7f9bc4",
    "border-radius:3px",
    "background:#ffffff",
    "color:#203047",
    "cursor:pointer",
  ].join(";");
  closeButton.addEventListener("click", () => dialog.close());

  dialog.addEventListener("close", () => dialog.remove(), { once: true });
  dialog.append(heading, body, closeButton);
  doc.body.appendChild(dialog);
  dialog.showModal();

  return dialog;
}