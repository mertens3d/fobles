import { FOBLES } from "../constants";
import type { DroplinkFobles as DroplinkConfig } from "../fobles.types";
import { createFoblesWrapper } from "../shared/create-fobles-wrapper";
import { createFoblesItemButton } from "../shared/create-fobles-item-button";
import { extractGuid, hasAnyGuidLikeOption } from "../shared/guid";

// Content Editor doesn't render an aria-label on either Drop Link's or Droplist's select at all
// (both share the same select.scContentControl.scCombobox markup), so distinguish them by the
// option list's value shape instead (see hasAnyGuidLikeOption/sc-droplist.ts).
const isDroplink = (select: HTMLSelectElement): boolean => {
  const ariaLabel = select.getAttribute("aria-label");
  if (ariaLabel) return /\bdroplink\s+field\b/i.test(ariaLabel);

  return hasAnyGuidLikeOption(select);
};

const createWrapper = (doc: Document): HTMLElement =>
  createFoblesWrapper(doc, {
    tag: "span",
    strategy: FOBLES.STRATEGIES.DROP_LINK,
    classNames: [FOBLES.CLASSES.WRAPPERS.DROP_LINK],
  });

const renderSelectedFobles = (
  doc: Document,
  select: HTMLSelectElement,
  wrapper: HTMLElement,
  config: DroplinkConfig,
): void => {
  wrapper.replaceChildren();

  const option = select.options[select.selectedIndex];
  const value = extractGuid(option?.value);
  if (!value) return;

  const label = option?.textContent?.trim() || value;
  const buttonText = config.getButtonText?.(select, label) ?? label;
  const button = createFoblesItemButton(doc, buttonText, value, FOBLES.CLASSES.BUTTONS.DROP_LINK);
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