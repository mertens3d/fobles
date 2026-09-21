import { FOBLES } from "../constants";
import { hasAnyGuidLikeOption } from "../shared/guid";
import type { DroplistFobles as DroplistConfig } from "../fobles.types";

// See sc-droplink.ts for why this can't rely on aria-label; hasAnyGuidLikeOption is what tells
// the two field types apart.
const isDroplist = (select: HTMLSelectElement): boolean => {
  const ariaLabel = select.getAttribute("aria-label");
  if (ariaLabel) return /\bdroplist\s+field\b/i.test(ariaLabel);

  return !hasAnyGuidLikeOption(select);
};

// Droplist has no item reference at all: Sitecore stores/renders only the chosen value's plain
// text, never the source item's GUID, so there is no "fo" value this strategy could ever build a
// navigation target from. Rather than hide the select behind a non-functional button, this leaves
// genuine Droplist fields completely untouched, only marking them processed so nothing else
// (including Fobles' own rescans) tries to claim them again.
export function applyDroplistStrategy(
  doc: Document,
  config: DroplistConfig,
): void {
  doc.querySelectorAll<HTMLSelectElement>(config.FoblesTopSelector).forEach((select) => {
    if (select.hasAttribute(FOBLES.ATTRIBUTES.MARKER) || !isDroplist(select)) return;

    select.setAttribute(FOBLES.ATTRIBUTES.MARKER, "1");
  });
}