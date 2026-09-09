import { FOBLES } from "../constants";
import type { IconFoble as IconConfig } from "../foble.types";

const isIconField = (input: HTMLInputElement): boolean => {
  const fieldCell = input.closest(FOBLES.SELECTORS.FIELD_CELL);
  return Array.from(fieldCell?.querySelectorAll(FOBLES.SELECTORS.FIELD_ACTION) ?? [])
    .some((button) =>
      (button.getAttribute("onclick") ?? "")
        .toLowerCase()
        .includes(`${FOBLES.SITECORE.ACTION_PREFIXES.ICON}:`),
    );
};

export function applyIconStrategy(doc: Document, config: IconConfig): void {
  doc.querySelectorAll<HTMLInputElement>(config.FobleTopSelector).forEach((input) => {
    if (input.hasAttribute(FOBLES.ATTRIBUTES.MARKER) || !isIconField(input)) return;

    input.setAttribute(FOBLES.ATTRIBUTES.MARKER, "1");
  });
}