// @source-path [fobles] src/content/shared/dialog/dialog-close-button.ts

import { ICONS } from "../../../constants/fobles.constants";

export type DialogCloseButtonOptions = {
  readonly className?: string;
  readonly iconClassName?: string;
};

export function createDialogCloseButton(
  doc: Document,
  dialog: HTMLDialogElement,
  options: DialogCloseButtonOptions = {},
): HTMLButtonElement {
  const button = doc.createElement("button");
  button.type = "button";
  button.className = options.className ?? "fobles-dialog-close";
  button.title = "Close";
  button.setAttribute("aria-label", "Close");

  const icon = doc.createElement("img");
  icon.className = options.iconClassName ?? "fobles-dialog-close-icon";
  icon.src = ICONS.CLOSE;
  icon.alt = "";

  button.appendChild(icon);
  button.addEventListener("click", () => dialog.close());
  return button;
}
