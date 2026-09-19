import { extractGuid } from "./guid";
import type { FoblesListItem } from "../fobles.types";

// The "read a <select>'s options, resolve each to a GUID + label, drop anything unresolved"
// shape is shared by every strategy that renders its items from a plain multiselect.
export const collectGuidOptionItems = (select: HTMLSelectElement): FoblesListItem[] =>
  Array.from(select.options)
    .map((option) => {
      const value = extractGuid(option.value);
      const label = option.textContent?.trim() ?? "";
      return value && label ? { value, label } : null;
    })
    .filter((item): item is FoblesListItem => item !== null);
