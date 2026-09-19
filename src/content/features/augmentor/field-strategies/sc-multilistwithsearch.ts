import { FOBLES } from "../constants";
import { SITECORE } from "../../../sitecore";
import { buildFoblesUrl, createFoblesButton } from "../helper";
import { applyButtonClasses } from "../shared/apply-button-classes";
import {
  createStyledSpacer,
  hideWithStyledSpacer,
} from "../shared/hide-with-styled-spacer";
import type { MultilistWithSearchFobles as MultilistWithSearchConfig } from "../fobles.types";
import { extractGuid } from "../shared/guid";

type MultilistWithSearchItem = {
  label: string;
  value: string;
};

const collectItems = (select: HTMLSelectElement): MultilistWithSearchItem[] =>
  Array.from(select.options)
    .map((option) => {
      const value = extractGuid(option.value);
      const label = option.textContent?.trim() ?? "";
      return value && label ? { value, label } : null;
    })
    .filter((item): item is MultilistWithSearchItem => item !== null);

const calculatePaneHeight = (select: HTMLSelectElement): number =>
  Math.max(Math.ceil(select.getBoundingClientRect().height || select.offsetHeight || 0), 96);

const createPaneWrapper = (doc: Document, height: number): HTMLDivElement => {
  const wrapper = doc.createElement("div");
  wrapper.setAttribute(FOBLES.ATTRIBUTES.WRAPPER, "1");
  wrapper.setAttribute(
    FOBLES.ATTRIBUTES.STRATEGY,
    FOBLES.STRATEGIES.MULTILIST_WITH_SEARCH,
  );
  wrapper.classList.add(
    FOBLES.CLASSES.WRAPPERS.BASE,
    FOBLES.CLASSES.WRAPPERS.STACKED,
    FOBLES.CLASSES.WRAPPERS.MULTILIST_WITH_SEARCH,
  );
  wrapper.style.setProperty(FOBLES.CSS_PROPERTIES.LIST_HEIGHT, `${height}px`);
  return wrapper;
};

const createItemButton = (
  doc: Document,
  item: MultilistWithSearchItem,
): HTMLButtonElement => {
  const button = createFoblesButton(doc, item.label, buildFoblesUrl(item.value), {
    classNames: [
      FOBLES.CLASSES.BUTTONS.BASE,
      FOBLES.CLASSES.BUTTONS.MULTILIST_WITH_SEARCH,
    ],
  });
  applyButtonClasses(button);
  return button;
};

const replacePane = (
  doc: Document,
  select: HTMLSelectElement,
  height: number,
): void => {
  const wrapper = createPaneWrapper(doc, height);
  collectItems(select).forEach((item) => wrapper.appendChild(createItemButton(doc, item)));
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
      ".scMultilistNav, img[id^='btnRight'], img[id^='btnLeft'], img[id^='btnUp'], img[id^='btnDown']",
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
    const navigation = control.querySelector<HTMLElement>(".scMultilistNav");
    if (navigation) {
      selectedPane.before(createStyledSpacer(navigation));
    }

    replacePane(doc, allPane, paneHeight);
    replacePane(doc, selectedPane, paneHeight);
    hideAncillaryControls(control);
    control.setAttribute(FOBLES.ATTRIBUTES.MARKER, "1");
  });
}