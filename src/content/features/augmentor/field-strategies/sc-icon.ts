import { FOBLES } from "../../../../constants/fobles";
import { CONST } from "../../../../constants/const";
import type { IconFobles as IconConfig } from "../fobles.types";

const isIconField = (input: HTMLInputElement): boolean => {
  const fieldCell = input.closest(CONST.SITECORE.SELECTORS.FIELD_CELL);
  return Array.from(fieldCell?.querySelectorAll(CONST.SITECORE.SELECTORS.FIELD_ACTION) ?? [])
    .some((button) =>
      (button.getAttribute("onclick") ?? "")
        .toLowerCase()
        .includes(`${CONST.SITECORE.ACTION_PREFIXES.ICON}:`),
    );
};

export function applyIconStrategy(doc: Document, config: IconConfig): void {
  doc.querySelectorAll<HTMLInputElement>(config.FoblesTopSelector).forEach((input) => {
    if (input.hasAttribute(FOBLES.ATTRIBUTES.MARKER) || !isIconField(input)) return;

    input.setAttribute(FOBLES.ATTRIBUTES.MARKER, "1");
  });
}