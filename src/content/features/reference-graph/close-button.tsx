// @source-path [fobles] src/content/toolbar/close-button.tsx

import { ICONS } from "../../../constants/fobles.constants";

export function createCloseButton(
    doc: Document,
    dialog: HTMLDialogElement,
): HTMLButtonElement {
    const button = doc.createElement("button");
    button.type = "button";
    button.className = "fobles-reference-graph-close";
    button.title = "Close";
    button.setAttribute("aria-label", "Close");

    const icon = doc.createElement("img");
    icon.className = "fobles-reference-graph-close-icon";
    icon.src = ICONS.CLOSE;
    icon.alt = "";

    button.appendChild(icon);
    button.addEventListener("click", () => dialog.close());

    return button;
}