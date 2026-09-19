import { FOBLES } from "../constants";
import { SITECORE } from "../../../sitecore";
import {
  createStyledSpacer,
  hideWithStyledSpacer,
} from "../shared/hide-with-styled-spacer";
import { createFoblesWrapper } from "../shared/create-fobles-wrapper";
import { createFoblesItemButton } from "../shared/create-fobles-item-button";
import { measureFoblesPaneHeight } from "../shared/measure-fobles-pane-height";
import { collectGuidOptionItems } from "../shared/collect-select-options";
import type { MultilistWithSearchFobles as MultilistWithSearchConfig } from "../fobles.types";

const calculatePaneHeight = (select: HTMLSelectElement): number => measureFoblesPaneHeight(select);

const createPaneWrapper = (doc: Document, height: number): HTMLElement =>
  createFoblesWrapper(doc, {
    strategy: FOBLES.STRATEGIES.MULTILIST_WITH_SEARCH,
    classNames: [FOBLES.CLASSES.WRAPPERS.STACKED, FOBLES.CLASSES.WRAPPERS.MULTILIST_WITH_SEARCH],
    cssHeightProperty: FOBLES.CSS_PROPERTIES.LIST_HEIGHT,
    height,
  });

const replacePane = (
  doc: Document,
  select: HTMLSelectElement,
  height: number,
): void => {
  const wrapper = createPaneWrapper(doc, height);
  collectGuidOptionItems(select).forEach((item) =>
    wrapper.appendChild(createFoblesItemButton(doc, item.label, item.value, FOBLES.CLASSES.BUTTONS.MULTILIST_WITH_SEARCH)),
  );
  select.classList.add(FOBLES.CLASSES.HIDDEN);
  select.after(wrapper);
};

const hideAncillaryControls = (control: Element): void => {
  const fieldCell = control.closest(SITECORE.SELECTORS.FIELD_CELL);
  fieldCell
    ?.querySelectorAll<HTMLElement>(SITECORE.SELECTORS.FIELD_ACTION_LINKS)
    .forEach(hideWithStyledSpacer);
  control
    .querySelectorAll<HTMLElement>(
      `${SITECORE.SELECTORS.MULTILIST_NAV}, ${SITECORE.SELECTORS.MULTILIST_WITH_SEARCH_NAV_ARROWS}`,
    )
    .forEach(hideWithStyledSpacer);
};

export function applyMultilistWithSearchStrategy(
  doc: Document,
  config: MultilistWithSearchConfig,
): void {
  doc.querySelectorAll(config.FoblesTopSelector).forEach((control) => {
    if (control.hasAttribute(FOBLES.ATTRIBUTES.MARKER)) return;

    const allPane = control.querySelector<HTMLSelectElement>("select.scBucketListBox");
    const selectedPane = control.querySelector<HTMLSelectElement>(
      "select.scBucketListSelectedBox",
    );
    if (!allPane || !selectedPane) return;

    const paneHeight = calculatePaneHeight(allPane);
    const navigation = control.querySelector<HTMLElement>(SITECORE.SELECTORS.MULTILIST_NAV);
    if (navigation) {
      selectedPane.before(createStyledSpacer(navigation));
    }

    replacePane(doc, allPane, paneHeight);
    replacePane(doc, selectedPane, paneHeight);
    hideAncillaryControls(control);
    control.setAttribute(FOBLES.ATTRIBUTES.MARKER, "1");
  });
}