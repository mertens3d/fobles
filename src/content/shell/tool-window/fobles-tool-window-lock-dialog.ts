// @source-path [fobles] src/content/shell/tool-window/fobles-tool-window-lock-dialog.ts
export function showFoblesToolWindowLockDialog(doc: Document, onTakeOwnership: () => Promise<boolean>): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const backdrop = doc.createElement("div");
    backdrop.className = "fobles-tool-window-lock-backdrop";
    const dialog = doc.createElement("section");
    dialog.className = "fobles-tool-window-lock-dialog";
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    const title = doc.createElement("h2");
    title.textContent = "Fobles Tool Window Already Active";
    const message = doc.createElement("p");
    message.textContent = "Another tab on this domain owns the Fobles Tool Window.";
    const actions = doc.createElement("div");
    actions.className = "fobles-tool-window-lock-actions";
    const close = doc.createElement("button");
    close.textContent = "Close";
    const takeOwnership = doc.createElement("button");
    takeOwnership.textContent = "Take Ownership";
    takeOwnership.className = "is-primary";
    actions.append(close, takeOwnership);
    dialog.append(title, message, actions);
    backdrop.appendChild(dialog);
    doc.body.appendChild(backdrop);

    function complete(acquired: boolean): void { backdrop.remove(); resolve(acquired); }
    close.addEventListener("click", () => complete(false));
    takeOwnership.addEventListener("click", () => {
      takeOwnership.disabled = true;
      void onTakeOwnership().then(complete).finally(() => { takeOwnership.disabled = false; });
    });
  });
}

export function showFoblesToolWindowOwnershipLostDialog(doc: Document): void {
  const backdrop = doc.createElement("div");
  backdrop.className = "fobles-tool-window-lock-backdrop";
  const dialog = doc.createElement("section");
  dialog.className = "fobles-tool-window-lock-dialog";
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-modal", "true");
  const title = doc.createElement("h2");
  title.textContent = "Fobles Tool Window Ownership Changed";
  const message = doc.createElement("p");
  message.textContent = "Another tab took ownership. This Fobles tool has stopped.";
  const close = doc.createElement("button");
  close.textContent = "Close";
  close.addEventListener("click", () => backdrop.remove());
  dialog.append(title, message, close);
  backdrop.appendChild(dialog);
  doc.body.appendChild(backdrop);
}
