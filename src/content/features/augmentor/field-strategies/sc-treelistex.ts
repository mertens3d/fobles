import { FOBLES } from "../constants";
import { SITECORE } from "../../../sitecore";
import { extensionLog } from "../../../logger";
import { hideWithStyledSpacer } from "../shared/hide-with-styled-spacer";
import { createFoblesWrapper } from "../shared/create-fobles-wrapper";
import { createFoblesItemButton } from "../shared/create-fobles-item-button";
import { measureFoblesPaneHeight } from "../shared/measure-fobles-pane-height";
import type { TreelistExFobles as TreelistExConfig } from "../fobles.types";

type TreelistExItem = {
  label: string;
  value: string;
};

const findEligibleHosts = (doc: Document, config: TreelistExConfig): HTMLElement[] =>
  Array.from(doc.querySelectorAll<HTMLElement>(config.FoblesTopSelector))
    .filter((host) => !host.hasAttribute(FOBLES.ATTRIBUTES.MARKER));

// Each selected item renders as a direct child div carrying the Sitecore path in its title attribute.
const getItems = (host: HTMLElement): TreelistExItem[] =>
  Array.from(host.children)
    .filter((child): child is HTMLElement => child.tagName === "DIV" && child.hasAttribute("title"))
    .map((child) => {
      const value = child.getAttribute("title")?.trim() ?? "";
      const label = child.textContent?.trim() ?? value;
      return value && label ? { value, label } : null;
    })
    .filter((item): item is TreelistExItem => item !== null);

const createWrapper = (doc: Document, height: number): HTMLElement =>
  createFoblesWrapper(doc, {
    strategy: FOBLES.STRATEGIES.TREELIST_EX,
    classNames: [FOBLES.CLASSES.WRAPPERS.STACKED, FOBLES.CLASSES.WRAPPERS.TREELIST_EX],
    cssHeightProperty: FOBLES.CSS_PROPERTIES.LIST_HEIGHT,
    height,
  });

const createItemButton = (doc: Document, item: TreelistExItem): HTMLButtonElement =>
  createFoblesItemButton(doc, item.label, item.value, FOBLES.CLASSES.BUTTONS.TREELIST_EX);

const hideEditButton = (host: HTMLElement): void => {
  const fieldCell = host.closest(SITECORE.SELECTORS.FIELD_CELL);
  const editButton = fieldCell?.querySelector<HTMLAnchorElement>(
    SITECORE.SELECTORS.FIELD_ACTION_LINKS,
  );
  if (editButton) hideWithStyledSpacer(editButton);
};

const replaceHostWithFobles = (doc: Document, host: HTMLElement): void => {
  const items = getItems(host);
  if (items.length === 0) return;

  const wrapper = createWrapper(doc, measureFoblesPaneHeight(host, { shrinkBy: 8 }));
  items.forEach((item) => wrapper.appendChild(createItemButton(doc, item)));

  hideEditButton(host);
  host.classList.add(FOBLES.CLASSES.HIDDEN);
  host.after(wrapper);
  host.setAttribute(FOBLES.ATTRIBUTES.MARKER, "1");
};

export function applyTreelistExStrategy(
  doc: Document,
  config: TreelistExConfig,
): void {
  const hosts = findEligibleHosts(doc, config);
  extensionLog.debug("Found", hosts.length, "eligible TreelistEx fields");

  hosts.forEach((host) => replaceHostWithFobles(doc, host));
}
