// @source-path [fobles] src/content/toolbar/close-button.tsx

export function createCloseButton(doc: Document, dialog: HTMLDialogElement): HTMLButtonElement {
  const closeButton = doc.createElement("button");
  closeButton.type = "button";
  closeButton.textContent = "Close";
  closeButton.className = "fobles-reference-graph-button fobles-reference-graph-button--close";
  closeButton.style.cssText = "position:absolute;top:10px;right:10px;z-index:1;";
  closeButton.addEventListener("click", () => dialog.close());
  return closeButton;
}
