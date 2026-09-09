import { FOBLES } from "../constants";
import type { DroplistFoble as DroplistConfig } from "../foble.types";

const isDroplist = (select: HTMLSelectElement): boolean =>
  /\bdroplist\s+field\b/i.test(select.getAttribute("aria-label") ?? "");

export function applyDroplistStrategy(
  doc: Document,
  config: DroplistConfig,
): void {
  doc.querySelectorAll<HTMLSelectElement>(config.FobleTopSelector).forEach((select) => {
    if (select.hasAttribute(FOBLES.ATTRIBUTES.MARKER) || !isDroplist(select)) return;

    select.setAttribute(FOBLES.ATTRIBUTES.MARKER, "1");
  });
}