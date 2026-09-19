import { FOBLES } from "../constants";
import type { DroplinkFobles as DroplinkConfig } from "../fobles.types";
import { buildFoblesUrl, createFoblesButton } from "../helper";
import { applyButtonClasses } from "../shared/apply-button-classes";
import { extractGuid } from "../shared/guid";

// The Content Editor tags Drop Link selects with an aria-label; the Field Editor dialog
// doesn't render that attribute at all, so fall back to treating unlabeled selects as
// candidates too (extractGuid downstream guards against non-Droplink selected values).
const isDroplink = (select: HTMLSelectElement): boolean => {
  const ariaLabel = select.getAttribute("aria-label");
  if (!ariaLabel) return true;
  return /\bdroplink\s+field\b/i.test(ariaLabel);
};

const createWrapper = (doc: Document): HTMLSpanElement => {
  const wrapper = doc.createElement("span");
  wrapper.setAttribute(FOBLES.ATTRIBUTES.WRAPPER, "1");
  wrapper.setAttribute(FOBLES.ATTRIBUTES.STRATEGY, FOBLES.STRATEGIES.DROP_LINK);
  wrapper.classList.add(
    FOBLES.CLASSES.WRAPPERS.BASE,
    FOBLES.CLASSES.WRAPPERS.DROP_LINK,
  );
  return wrapper;
};

const renderSelectedFobles = (
  doc: Document,
  select: HTMLSelectElement,
  wrapper: HTMLSpanElement,
  config: DroplinkConfig,
): void => {
  wrapper.replaceChildren();

  const option = select.options[select.selectedIndex];
  const value = extractGuid(option?.value);
  if (!value) return;

  const label = option?.textContent?.trim() || value;
  const button = createFoblesButton(
    doc,
    config.getButtonText?.(select, label) ?? label,
    buildFoblesUrl(value),
    {
      classNames: [
        FOBLES.CLASSES.BUTTONS.BASE,
        FOBLES.CLASSES.BUTTONS.DROP_LINK,
      ],
    },
  );
  applyButtonClasses(button);
  wrapper.appendChild(button);
};

export function applyDroplinkStrategy(
  doc: Document,
  config: DroplinkConfig,
): void {
  doc.querySelectorAll<HTMLSelectElement>(config.FoblesTopSelector).forEach((select) => {
    if (select.hasAttribute(FOBLES.ATTRIBUTES.MARKER) || !isDroplink(select)) return;

    const wrapper = createWrapper(doc);
    select.classList.add(FOBLES.CLASSES.HIDDEN);
    select.after(wrapper);
    select.setAttribute(FOBLES.ATTRIBUTES.MARKER, "1");
    renderSelectedFobles(doc, select, wrapper, config);
    select.addEventListener("change", () => {
      if (wrapper.isConnected) renderSelectedFobles(doc, select, wrapper, config);
    });
  });
}