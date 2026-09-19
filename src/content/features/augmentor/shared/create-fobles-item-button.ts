import { FOBLES } from "../constants";
import { buildFoblesUrl, createFoblesButton } from "../helper";
import { applyButtonClasses } from "./apply-button-classes";

// Every field strategy's item button is a Fobles button carrying one variant class on top of
// the shared button chrome; this walls that assembly off as a single black-box call.
export const createFoblesItemButton = (
  doc: Document,
  label: string,
  value: string,
  variantClass: string,
): HTMLButtonElement => {
  const button = createFoblesButton(doc, label, buildFoblesUrl(value), {
    classNames: [FOBLES.CLASSES.BUTTONS.BASE, variantClass],
  });
  applyButtonClasses(button);
  return button;
};
