import { FOBLES } from "../constants";
import { SITECORE } from "../../../extension/sitecore";
import type { IconFobles as IconConfig } from "../fobles.types";

const isIconField = (input: HTMLInputElement): boolean => {
  const fieldCell = input.closest(SITECORE.SELECTORS.FIELD_CELL);
  return Array.from(fieldCell?.querySelectorAll(SITECORE.SELECTORS.FIELD_ACTION) ?? [])
    .some((button) =>
      (button.getAttribute("onclick") ?? "")
        .toLowerCase()
        .includes(`${SITECORE.ACTION_PREFIXES.ICON}:`),
    );
};

export function applyIconStrategy(doc: Document, config: IconConfig): void {
  doc.querySelectorAll<HTMLInputElement>(config.FoblesTopSelector).forEach((input) => {
    if (input.hasAttribute(FOBLES.ATTRIBUTES.MARKER) || !isIconField(input)) return;

    input.setAttribute(FOBLES.ATTRIBUTES.MARKER, "1");
  });
}