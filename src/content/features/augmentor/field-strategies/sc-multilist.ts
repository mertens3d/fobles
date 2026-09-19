import { FOBLES } from "../constants";
import { SITECORE } from "../../../sitecore";
import { hideWithStyledSpacer } from "../shared/hide-with-styled-spacer";
import { createFoblesWrapper } from "../shared/create-fobles-wrapper";
import { createFoblesItemButton } from "../shared/create-fobles-item-button";
import { measureFoblesPaneHeight } from "../shared/measure-fobles-pane-height";
import type { MultilistOptionsFobles as MultilistConfig } from "../fobles.types";

type MultilistOption = {
  value: string;
  label: string;
};

const findEligibleHosts = (table: Element): HTMLSelectElement[] =>
  Array.from(table.querySelectorAll<HTMLSelectElement>(SITECORE.SELECTORS.MULTILIST_BOX))
    .filter((select) => !select.hasAttribute(FOBLES.ATTRIBUTES.MARKER));

const getHostContainer = (select: HTMLSelectElement): Element | null =>
  select.closest("td") ?? select.parentElement;

const collectOptions = (select: HTMLSelectElement): MultilistOption[] => {
  const seen = new Set<string>();
  const entries: MultilistOption[] = [];

  Array.from(select.options).forEach((option) => {
    const value = (option as HTMLOptionElement).value?.trim() ?? "";
    const label = option.textContent?.trim() ?? value;
    if (!value || seen.has(value)) return;

    seen.add(value);
    entries.push({ value, label });
  });

  return entries;
};

const calculateContainerHeight = (select: HTMLSelectElement): number =>
  measureFoblesPaneHeight(select, { shrinkBy: 8 });

const createMultilistWrapper = (doc: Document, height: number): HTMLElement =>
  createFoblesWrapper(doc, {
    strategy: FOBLES.STRATEGIES.MULTILIST_OPTIONS,
    classNames: [FOBLES.CLASSES.WRAPPERS.STACKED, FOBLES.CLASSES.WRAPPERS.MULTILIST],
    cssHeightProperty: FOBLES.CSS_PROPERTIES.LIST_HEIGHT,
    height,
  });

const addOptionButtons = (
  doc: Document,
  wrapper: HTMLElement,
  optionValues: MultilistOption[],
): void => {
  optionValues.forEach((option) => {
    const button = createFoblesItemButton(doc, option.label, option.value, FOBLES.CLASSES.BUTTONS.MULTILIST);
    wrapper.appendChild(button);
  });
};

const hideOriginalControls = (
  control: Element,
  select: HTMLSelectElement,
): void => {
  const row = control.closest("tr");
  const fieldCell = control.closest(SITECORE.SELECTORS.FIELD_CELL) ?? select.closest("td") ?? select.parentElement;

  row?.querySelectorAll<HTMLElement>(SITECORE.SELECTORS.MULTILIST_NAV_BUTTON).forEach((navButton) => {
    navButton.classList.add(FOBLES.CLASSES.HIDDEN);
  });

  fieldCell?.querySelectorAll<HTMLElement>(SITECORE.SELECTORS.MULTILIST_FIELD_BUTTONS).forEach((actionButton) => {
    hideWithStyledSpacer(actionButton);
  });

  select.setAttribute(FOBLES.ATTRIBUTES.MARKER, "1");
  select.classList.add(FOBLES.CLASSES.HIDDEN);
};

const applyFoblesToHost = (
  doc: Document,
  control: Element,
  select: HTMLSelectElement,
): void => {
  const host = getHostContainer(select);
  if (!host) return;

  const optionValues = collectOptions(select);
  if (optionValues.length === 0) return;

  const height = calculateContainerHeight(select);
  const wrapper = createMultilistWrapper(doc, height);
  addOptionButtons(doc, wrapper, optionValues);
  hideOriginalControls(control, select);
  host.appendChild(wrapper);
};

export function applyMultilistStrategy(
  doc: Document,
  config: MultilistConfig,
): void {
  const tables = doc.querySelectorAll(config.FoblesTopSelector);

  tables.forEach((table) => {
    if (table.hasAttribute(FOBLES.ATTRIBUTES.MARKER)) return;

    const hosts = findEligibleHosts(table);
    hosts.forEach((select) => applyFoblesToHost(doc, table, select));
  });
}
