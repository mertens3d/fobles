import { FOBLES } from "../constants";
import { SITECORE } from "../../../extension/sitecore";
import type { TagListFobles as TagListConfig } from "../fobles.types";
import {
  buildFoblesUrl,
  createFoblesButton,
} from "../helper";
import { applyButtonClasses } from "../shared/apply-button-classes";
import { extractGuid, formatFoId } from "../shared/guid";
import { hideWithStyledSpacer } from "../shared/hide-with-styled-spacer";

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

const collectSelectedItems = (select: HTMLSelectElement): TagListItem[] =>
  Array.from(select.options)
    .map((option) => {
      const value = extractGuid(option.value);
      const label = option.textContent?.trim() ?? "";
      return value && label ? { value, label } : null;
    })
    .filter((item): item is TagListItem => item !== null);

const createPaneWrapper = (doc: Document, height: number): HTMLDivElement => {
  const wrapper = doc.createElement("div");
  wrapper.setAttribute(FOBLES.ATTRIBUTES.WRAPPER, "1");
  wrapper.setAttribute(FOBLES.ATTRIBUTES.STRATEGY, FOBLES.STRATEGIES.TAG_LIST);
  wrapper.classList.add(
    FOBLES.CLASSES.WRAPPERS.BASE,
    FOBLES.CLASSES.WRAPPERS.STACKED,
    FOBLES.CLASSES.WRAPPERS.TAG_LIST,
  );
  wrapper.style.setProperty(
    FOBLES.CSS_PROPERTIES.LIST_HEIGHT,
    `${Math.max(Math.ceil(height), 96)}px`,
  );
  return wrapper;
};

const replacePane = (
  doc: Document,
  pane: HTMLElement,
  items: TagListItem[],
): void => {
  const height = pane.getBoundingClientRect().height || pane.offsetHeight;
  const wrapper = createPaneWrapper(doc, height);
  items.forEach((item) => {
    const button = createFoblesButton(doc, item.label, buildFoblesUrl(item.value), {
      classNames: [
        FOBLES.CLASSES.BUTTONS.BASE,
        FOBLES.CLASSES.BUTTONS.TAG_LIST,
      ],
    });
    applyButtonClasses(button);
    wrapper.appendChild(button);
  });

  pane.classList.add(FOBLES.CLASSES.HIDDEN);
  pane.after(wrapper);
};

const hideNavigation = (control: Element): void => {
  control
    .querySelectorAll<HTMLElement>(
      "img[id$='_right'], img[id$='_left'], img[id$='_up'], img[id$='_down']",
    )
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
    replacePane(doc, selectedPane, collectSelectedItems(selectedPane));
    hideNavigation(control);
    control.setAttribute(FOBLES.ATTRIBUTES.MARKER, "1");
  });
}