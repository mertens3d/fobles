import { FOBLES } from "../constants";
import { SITECORE } from "../../../sitecore";
import { buildFoblesUrl, createFoblesButton } from "../helper";
import { extensionLog } from "../../../logger";
import { applyButtonClasses } from "../shared/apply-button-classes";
import { hideWithStyledSpacer } from "../shared/hide-with-styled-spacer";
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

const calculateContainerHeight = (host: HTMLElement): number => {
  const baseHeight = Math.max(host.getBoundingClientRect().height || host.offsetHeight || 0, 96);
  return Math.max(baseHeight - 8, 96);
};

const createWrapper = (doc: Document, height: number): HTMLDivElement => {
  const wrapper = doc.createElement("div");
  wrapper.setAttribute(FOBLES.ATTRIBUTES.WRAPPER, "1");
  wrapper.setAttribute(FOBLES.ATTRIBUTES.STRATEGY, FOBLES.STRATEGIES.TREELIST_EX);
  wrapper.classList.add(
    FOBLES.CLASSES.WRAPPERS.BASE,
    FOBLES.CLASSES.WRAPPERS.STACKED,
    FOBLES.CLASSES.WRAPPERS.TREELIST_EX,
  );
  wrapper.style.setProperty(FOBLES.CSS_PROPERTIES.LIST_HEIGHT, `${height}px`);
  return wrapper;
};

const createItemButton = (doc: Document, item: TreelistExItem): HTMLButtonElement => {
  const button = createFoblesButton(doc, item.label, buildFoblesUrl(item.value), {
    classNames: [
      FOBLES.CLASSES.BUTTONS.BASE,
      FOBLES.CLASSES.BUTTONS.TREELIST_EX,
    ],
  });
  applyButtonClasses(button);
  return button;
};

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

  const wrapper = createWrapper(doc, calculateContainerHeight(host));
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
