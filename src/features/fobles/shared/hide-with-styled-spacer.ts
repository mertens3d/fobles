import { FOBLES } from "../constants";

const removeInteractiveAttributes = (element: HTMLElement): void => {
  element.removeAttribute("id");
  element.removeAttribute("name");
  element.removeAttribute("href");
  element.removeAttribute("role");

  Array.from(element.attributes).forEach((attribute) => {
    if (attribute.name.toLowerCase().startsWith("on")) {
      element.removeAttribute(attribute.name);
    }
  });

  if (element.matches("a, button, input, select, textarea, [tabindex]")) {
    element.tabIndex = -1;
  }
};

export const createStyledSpacer = (element: HTMLElement): HTMLElement => {
  const computedStyle = element.ownerDocument.defaultView?.getComputedStyle(element);
  const spacer = element.cloneNode(true) as HTMLElement;
  spacer.classList.add(FOBLES.CLASSES.FIELD_SPACER);
  [spacer, ...Array.from(spacer.querySelectorAll<HTMLElement>("*"))]
    .forEach(removeInteractiveAttributes);
  spacer.setAttribute("aria-hidden", "true");
  spacer.style.display = computedStyle?.display ?? "block";
  spacer.style.flex = computedStyle?.flex ?? "0 1 auto";
  spacer.style.visibility = "hidden";
  spacer.style.pointerEvents = "none";

  return spacer;
};

export const hideWithStyledSpacer = (element: HTMLElement): void => {
  if (element.classList.contains(FOBLES.CLASSES.HIDDEN)) return;

  element.after(createStyledSpacer(element));
  element.classList.add(FOBLES.CLASSES.HIDDEN);
};