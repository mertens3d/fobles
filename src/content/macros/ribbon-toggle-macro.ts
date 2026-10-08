import { findRibbonCheckbox } from "../features/augmentor/proxy-buttons-ribbon";

// Generic "macro" helpers for driving Sitecore's own ribbon toggle checkboxes (Raw Values,
// Standard Fields, ...) programmatically. Returns null when the checkbox can't be found on the
// page at all, distinct from a real false/true state.
export function isRibbonCheckboxEnabled(doc: Document, checkboxId: string): boolean | null {
  const checkbox = findRibbonCheckbox(doc, checkboxId);
  return checkbox ? checkbox.checked : null;
}

// Clicking a Sitecore ribbon checkbox triggers a full postback that reloads the current frame -
// callers can't await the result in the same execution context, only whether a click actually
// fired (checkbox already at the desired state is a no-op, not a click).
export function setRibbonCheckboxEnabled(
  doc: Document,
  checkboxId: string,
  enabled: boolean,
): boolean {
  const checkbox = findRibbonCheckbox(doc, checkboxId);
  if (!checkbox || checkbox.checked === enabled) return false;
  checkbox.click();
  return true;
}
