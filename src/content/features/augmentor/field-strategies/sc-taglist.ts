import { FOBLES } from "../constants";
import { SITECORE } from "../../../sitecore";
import type { TagListFobles as TagListConfig } from "../fobles.types";
import { formatFoId } from "../shared/guid";
import { hideWithStyledSpacer } from "../shared/hide-with-styled-spacer";
import { createFoblesWrapper } from "../shared/create-fobles-wrapper";
import { createFoblesItemButton } from "../shared/create-fobles-item-button";
import { measureFoblesPaneHeight } from "../shared/measure-fobles-pane-height";
import { collectGuidOptionItems } from "../shared/collect-select-options";

type TagListItem = {
  label: string;
  value: string;
};

const collectTreeItems = (pane: Element): TagListItem[] =>
  Array.from(pane.querySelectorAll(SITECORE.SELECTORS.TREE_NODES_WITH_ID))
    .map((node) => {
      const compactGuid = node.id.match(/([0-9a-f]{32})$/i)?.[1];
      const value = compactGuid ? formatFoId(compactGuid) : null;
      const label = node.querySelector(SITECORE.SELECTORS.TREE_NODE_TITLE)?.textContent?.trim() ?? "";
      return value && label ? { value, label } : null;
    })
    .filter((item): item is TagListItem => item !== null);

const createPaneWrapper = (doc: Document, height: number): HTMLElement =>
  createFoblesWrapper(doc, {
    strategy: FOBLES.STRATEGIES.TAG_LIST,
    classNames: [FOBLES.CLASSES.WRAPPERS.STACKED, FOBLES.CLASSES.WRAPPERS.TAG_LIST],
    cssHeightProperty: FOBLES.CSS_PROPERTIES.LIST_HEIGHT,
    height,
  });

const replacePane = (
  doc: Document,
  pane: HTMLElement,
  items: TagListItem[],
): void => {
  const wrapper = createPaneWrapper(doc, measureFoblesPaneHeight(pane));
  items.forEach((item) => {
    wrapper.appendChild(createFoblesItemButton(doc, item.label, item.value, FOBLES.CLASSES.BUTTONS.TAG_LIST));
  });

  pane.classList.add(FOBLES.CLASSES.HIDDEN);
  pane.after(wrapper);
};

const hideNavigation = (control: Element): void => {
  control
    .querySelectorAll<HTMLElement>(SITECORE.SELECTORS.TAG_LIST_NAV_ARROWS)
    .forEach(hideWithStyledSpacer);
};

export function applyTagListStrategy(doc: Document, config: TagListConfig): void {
  doc.querySelectorAll<HTMLElement>(config.FoblesTopSelector).forEach((control) => {
    if (control.hasAttribute(FOBLES.ATTRIBUTES.MARKER)) return;

    const allPane = control.querySelector<HTMLElement>("td[rowspan] > .scScrollbox");
    const selectedPane = control.querySelector<HTMLSelectElement>(
      "select.scContentControlMultilistBox",
    );
    if (!allPane || !selectedPane) return;

    replacePane(doc, allPane, collectTreeItems(allPane));
    replacePane(doc, selectedPane, collectGuidOptionItems(selectedPane));
    hideNavigation(control);
    control.setAttribute(FOBLES.ATTRIBUTES.MARKER, "1");
  });
}