import { FOBLES } from "../constants";
import { SITECORE } from "../../../extension/sitecore";
import { buildFoblesUrl, createFoblesButton } from "../helper";
import { applyButtonClasses } from "../shared/apply-button-classes";
import { extractGuid, formatFoId } from "../shared/guid";
import type { TreeListFobles as TreeListConfig } from "../fobles.types";

type TreeListItem = {
  label: string;
  value: string;
};

const getTreeNodeValue = (node: Element): string | null => {
  const match = node.id.match(/([0-9a-f]{32})$/i);
  return match ? formatFoId(match[1]) : null;
};

const getAllTreeItems = (treePane: Element): TreeListItem[] =>
  Array.from(treePane.querySelectorAll(SITECORE.SELECTORS.TREE_NODES_WITH_ID))
    .map((node) => {
      const value = getTreeNodeValue(node);
      const label = node.querySelector(SITECORE.SELECTORS.TREE_NODE_TITLE)?.textContent?.trim() ?? "";
      return value && label ? { value, label } : null;
    })
    .filter((item): item is TreeListItem => item !== null);

const getSelectedItems = (selectedPane: Element): TreeListItem[] => {
  const select = selectedPane.querySelector<HTMLSelectElement>(SITECORE.SELECTORS.MULTILIST_BOX);
  if (!select) return [];

  return Array.from(select.options)
    .map((option) => {
      const value = extractGuid(option.value);
      const label = option.textContent?.trim() ?? "";
      return value && label ? { value, label } : null;
    })
    .filter((item): item is TreeListItem => item !== null);
};

const calculatePaneHeight = (pane: Element): number =>
  Math.max(Math.ceil(pane.getBoundingClientRect().height || 0), 96);

const createPaneWrapper = (doc: Document, height: number): HTMLDivElement => {
  const wrapper = doc.createElement("div");
  wrapper.setAttribute(FOBLES.ATTRIBUTES.WRAPPER, "1");
  wrapper.setAttribute(FOBLES.ATTRIBUTES.STRATEGY, FOBLES.STRATEGIES.TREE_LIST);
  wrapper.classList.add(
    FOBLES.CLASSES.WRAPPERS.BASE,
    FOBLES.CLASSES.WRAPPERS.STACKED,
    FOBLES.CLASSES.WRAPPERS.TREE_LIST,
  );
  wrapper.style.setProperty(FOBLES.CSS_PROPERTIES.LIST_HEIGHT, `${height}px`);
  return wrapper;
};

const createTreeListButton = (doc: Document, item: TreeListItem): HTMLButtonElement => {
  const button = createFoblesButton(doc, item.label, buildFoblesUrl(item.value), {
    classNames: [
      FOBLES.CLASSES.BUTTONS.BASE,
      FOBLES.CLASSES.BUTTONS.TREE_LIST,
    ],
  });
  applyButtonClasses(button);
  return button;
};

const replacePaneWithFobles = (
  doc: Document,
  pane: Element,
  items: TreeListItem[],
): boolean => {
  if (items.length === 0) return false;

  const wrapper = createPaneWrapper(doc, calculatePaneHeight(pane));
  items.forEach((item) => wrapper.appendChild(createTreeListButton(doc, item)));
  pane.classList.add(FOBLES.CLASSES.HIDDEN);
  pane.after(wrapper);
  return true;
};

const hideTreeListNavigation = (control: Element): void => {
  control.querySelectorAll<HTMLElement>(SITECORE.SELECTORS.MULTILIST_NAV_BUTTON).forEach((button) => {
    button.classList.add(FOBLES.CLASSES.HIDDEN);
  });
};

export function applyTreeListStrategy(
  doc: Document,
  config: TreeListConfig,
): void {
  doc.querySelectorAll(config.FoblesTopSelector).forEach((control) => {
    if (control.hasAttribute(FOBLES.ATTRIBUTES.MARKER)) return;

    const allTreePane = control.querySelector(SITECORE.SELECTORS.TREE_LIST_ALL_PANE);
    const selectedPane = control.querySelector(SITECORE.SELECTORS.TREE_LIST_SELECTED_PANE);
    const replacedAllPane = allTreePane
      ? replacePaneWithFobles(doc, allTreePane, getAllTreeItems(allTreePane))
      : false;
    const replacedSelectedPane = selectedPane
      ? replacePaneWithFobles(doc, selectedPane, getSelectedItems(selectedPane))
      : false;

    if (!replacedAllPane && !replacedSelectedPane) return;

    hideTreeListNavigation(control);
    control.setAttribute(FOBLES.ATTRIBUTES.MARKER, "1");
  });
}