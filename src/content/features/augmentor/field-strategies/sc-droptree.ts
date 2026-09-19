import { FOBLES } from "../constants";
import { buildFoblesUrl, createFoblesButton, normalizeFoblesValue } from "../helper";
import { extensionLog } from "../../../logger";
import { applyButtonClasses } from "../shared/apply-button-classes";
import type { DropTreeFobles as DropTreeConfig } from "../fobles.types";

const getFoblesValue = (host: HTMLInputElement): string | null => {
  const value = host.value.trim();
  return value || null;
};

const findEligibleHosts = (doc: Document, config: DropTreeConfig): HTMLInputElement[] =>
  Array.from(doc.querySelectorAll<HTMLInputElement>(config.FoblesTopSelector))
    .filter((host) => !host.hasAttribute(FOBLES.ATTRIBUTES.MARKER))
    .filter((host) => Boolean(getFoblesValue(host)));

// Mimics Sitecore's own input chrome (not a Fobles design token) so the wrapper reads as a
// drop-in replacement for the input it hides.
const SITECORE_INPUT_STYLE = {
  BACKGROUND: "#ffffff",
  BORDER: "1px solid #cccccc",
  FLAT_CORNER_RADIUS: "0px",
  HEIGHT: "35px",
} as const;

const createDropTreeWrapper = (doc: Document): HTMLSpanElement => {
  const wrapper = doc.createElement("span");
  wrapper.setAttribute(FOBLES.ATTRIBUTES.WRAPPER, "1");
  wrapper.setAttribute(FOBLES.ATTRIBUTES.STRATEGY, FOBLES.STRATEGIES.DROP_TREE);
  wrapper.classList.add(
    FOBLES.CLASSES.WRAPPERS.BASE,
    FOBLES.CLASSES.WRAPPERS.STACKED,
  );
  wrapper.style.setProperty("height", SITECORE_INPUT_STYLE.HEIGHT);
  wrapper.style.setProperty("background", SITECORE_INPUT_STYLE.BACKGROUND);
  // Match Sitecore's input outline: square right corners since the dropdown arrow sits there.
  wrapper.style.setProperty("border", SITECORE_INPUT_STYLE.BORDER);
  wrapper.style.setProperty("border-top-right-radius", SITECORE_INPUT_STYLE.FLAT_CORNER_RADIUS);
  wrapper.style.setProperty("border-bottom-right-radius", SITECORE_INPUT_STYLE.FLAT_CORNER_RADIUS);
  return wrapper;
};

const createDropTreeButton = (
  doc: Document,
  value: string,
): HTMLButtonElement => {
  const normalizedValue = normalizeFoblesValue(value);
  const foblesUrl = buildFoblesUrl(normalizedValue);
  const button = createFoblesButton(doc, value, foblesUrl, {
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

const replaceHostWithFobles = (
  doc: Document,
  host: HTMLInputElement,
  config: DropTreeConfig,
): void => {
  const value = getFoblesValue(host);
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
  extensionLog.debug("Found", hosts.length, "eligible DropTree fields");

  hosts.forEach((host) => replaceHostWithFobles(doc, host, config));
}