// Proxy Buttons mirror a real Sitecore ribbon checkbox and proxy clicks to it. The ribbon
// checkbox stays the source of truth. These live in the main toolbar menu (not the editor
// header) since the editor header gets redrawn every time a tree item is picked.
import { getChildFrameDocuments } from "./shared/frame-documents";

export const findRibbonCheckbox = (
  doc: Document,
  checkboxId: string,
): HTMLInputElement | null => {
  const ownCheckbox = doc.getElementById(checkboxId) as HTMLInputElement | null;
  const frameCheckbox = ownCheckbox
    ? null
    : getChildFrameDocuments(doc)
        .map((frameDoc) => findRibbonCheckbox(frameDoc, checkboxId))
        .find((result): result is HTMLInputElement => result !== null) ?? null;
  return ownCheckbox ?? frameCheckbox;
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
