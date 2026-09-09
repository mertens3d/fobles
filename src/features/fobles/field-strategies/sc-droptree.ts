import { FOBLES } from "../constants";
import { buildFobleUrl, createFobleButton, normalizeFobleValue } from "../helper";
import { fobleLog } from "../logger";
import { applyButtonClasses } from "../shared/apply-button-classes";
import type { DropTreeFoble as DropTreeConfig } from "../foble.types";

const getFobleValue = (host: HTMLInputElement): string | null => {
  const value = host.value.trim();
  return value || null;
};

const findEligibleHosts = (doc: Document, config: DropTreeConfig): HTMLInputElement[] =>
  Array.from(doc.querySelectorAll<HTMLInputElement>(config.FobleTopSelector))
    .filter((host) => !host.hasAttribute(FOBLES.ATTRIBUTES.MARKER))
    .filter((host) => Boolean(getFobleValue(host)));

const createDropTreeWrapper = (doc: Document): HTMLSpanElement => {
  const wrapper = doc.createElement("span");
  wrapper.setAttribute(FOBLES.ATTRIBUTES.WRAPPER, "1");
  wrapper.setAttribute(FOBLES.ATTRIBUTES.STRATEGY, FOBLES.STRATEGIES.DROP_TREE);
  wrapper.classList.add(
    FOBLES.CLASSES.WRAPPERS.BASE,
    FOBLES.CLASSES.WRAPPERS.STACKED,
  );
  wrapper.style.setProperty("height", "35px");
  wrapper.style.setProperty("background", "#ffffff");
  // Match Sitecore's input outline: square right corners since the dropdown arrow sits there.
  wrapper.style.setProperty("border", "1px solid #cccccc");
  wrapper.style.setProperty("border-top-right-radius", "0px");
  wrapper.style.setProperty("border-bottom-right-radius", "0px");
  return wrapper;
};

const createDropTreeButton = (
  doc: Document,
  value: string,
): HTMLButtonElement => {
  const normalizedValue = normalizeFobleValue(value);
  const fobleUrl = buildFobleUrl(normalizedValue);
  const button = createFobleButton(doc, value, fobleUrl, {
    classNames: [FOBLES.CLASSES.BUTTONS.BASE],
  });
  applyButtonClasses(button);
  return button;
};

const hideAdditionalElements = (host: HTMLInputElement, selectors?: string[]): void => {
  if (!selectors?.length) return;

  const scope = host.closest("table") ?? host.parentElement;
  scope?.querySelectorAll<HTMLElement>(selectors.join(", ")).forEach((el) => {
    el.classList.add(FOBLES.CLASSES.HIDDEN);
  });
};

const replaceHostWithFoble = (
  doc: Document,
  host: HTMLInputElement,
  config: DropTreeConfig,
): void => {
  const value = getFobleValue(host);
  if (!value) return;

  const wrapper = createDropTreeWrapper(doc);
  const button = createDropTreeButton(doc, value);
  wrapper.appendChild(button);

  host.classList.add(FOBLES.CLASSES.HIDDEN);
  hideAdditionalElements(host, config.additionalElementsToHide);
  host.parentNode?.insertBefore(wrapper, host.nextSibling);
  host.setAttribute(FOBLES.ATTRIBUTES.MARKER, "1");
};

export function applyDropTreeStrategy(
  doc: Document,
  config: DropTreeConfig,
): void {
  const hosts = findEligibleHosts(doc, config);
  fobleLog.Debug("Found", hosts.length, "eligible DropTree fields");

  hosts.forEach((host) => replaceHostWithFoble(doc, host, config));
}