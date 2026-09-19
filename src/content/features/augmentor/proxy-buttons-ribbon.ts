// Proxy Buttons mirror a real Sitecore ribbon checkbox and proxy clicks to it. The ribbon
// checkbox stays the source of truth. These live in the main toolbar menu (not the editor
// header) since the editor header gets redrawn every time a tree item is picked.

export const findRibbonCheckbox = (
  doc: Document,
  checkboxId: string,
): HTMLInputElement | null => {
  const checkbox = doc.getElementById(checkboxId) as HTMLInputElement | null;
  if (checkbox) return checkbox;

  for (const frame of Array.from(doc.querySelectorAll("iframe, frame"))) {
    try {
      const frameDoc = (frame as HTMLIFrameElement | HTMLFrameElement)
        .contentDocument;
      if (!frameDoc) continue;

      const frameCheckbox = findRibbonCheckbox(frameDoc, checkboxId);
      if (frameCheckbox) return frameCheckbox;
    } catch {
      // Ignore inaccessible cross-origin frames.
    }
  }

  return null;
};

export const postSitecoreEvent = (doc: Document, eventName: string): boolean => {
  const host = doc.body;
  if (!host) return false;

  const trigger = doc.createElement("button");
  trigger.type = "button";
  trigger.hidden = true;
  trigger.setAttribute(
    "onclick",
    `if (typeof scForm !== 'undefined') { return scForm.postEvent(this, event, '${eventName}'); }`,
  );
  host.appendChild(trigger);
  trigger.click();
  trigger.remove();
  return true;
};
