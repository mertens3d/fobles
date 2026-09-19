import { FOBLES } from "../constants";
import type {
  QuickInfoCandidate,
  QuickInfoSectionFobles as QuickInfoSectionConfig,
  QuickInfoSource,
} from "../fobles.types";
import { buildFoblesUrl, createFoblesButton } from "../helper";
import { createFoblesWrapper } from "../shared/create-fobles-wrapper";
import { extractGuid } from "../shared/guid";

const startsWithLabel = (value: string, candidate: string): boolean =>
  value.trim().toLowerCase().startsWith(candidate.trim().toLowerCase());

const getSourceValue = (element: Element, source: QuickInfoSource): string =>
  source.valueSource === "value"
    ? (element as HTMLInputElement).value.trim()
    : element.textContent?.replace(/\s+/g, " ").trim() ?? "";

const getTarget = (value: string, source: QuickInfoSource): string | null => {
  if (source.targetKind === "guid") return extractGuid(value);
  return /^\/sitecore\//i.test(value) ? value : null;
};

const createWrapper = (
  doc: Document,
  source: QuickInfoSource,
): HTMLElement =>
  createFoblesWrapper(doc, {
    tag: "span",
    strategy: FOBLES.STRATEGIES.QUICK_INFO_SECTION,
    classNames: [
      source.wrapperVariant === "quickinfo"
        ? FOBLES.CLASSES.WRAPPERS.QUICK_INFO
        : FOBLES.CLASSES.WRAPPERS.ROW,
    ],
    cssHeightProperty: FOBLES.CSS_PROPERTIES.HEIGHT,
    height: 24,
  });

const replaceSource = (
  doc: Document,
  element: HTMLElement,
  source: QuickInfoSource,
): void => {
  if (element.hasAttribute(FOBLES.ATTRIBUTES.MARKER)) return;

  const value = getSourceValue(element, source);
  const target = getTarget(value, source);
  if (!target) return;

  const wrapper = createWrapper(doc, source);
  const button = createFoblesButton(doc, value, buildFoblesUrl(target), {
    classNames: [
      FOBLES.CLASSES.BUTTONS.BASE,
      source.wrapperVariant === "quickinfo"
        ? FOBLES.CLASSES.BUTTONS.QUICK_INFO
        : "",
    ].filter(Boolean),
  });
  wrapper.appendChild(button);

  element.classList.add(FOBLES.CLASSES.HIDDEN);
  element.setAttribute(FOBLES.ATTRIBUTES.MARKER, "1");
  element.after(wrapper);
};

const applyCandidate = (
  doc: Document,
  row: HTMLTableRowElement,
  candidate: QuickInfoCandidate,
): void => {
  const labelCell = row.cells.item(0);
  const valueCell = row.cells.item(1);
  if (!labelCell || !valueCell) return;
  if (!startsWithLabel(labelCell.textContent ?? "", candidate.labelStartsWith)) return;

  candidate.sources.forEach((source) => {
    const element = valueCell.querySelector<HTMLElement>(source.selector);
    if (element) replaceSource(doc, element, source);
  });
};

export function applyQuickInfoSectionStrategy(
  doc: Document,
  config: QuickInfoSectionConfig,
): void {
  doc.querySelectorAll<HTMLTableElement>(config.FoblesTopSelector).forEach((table) => {
    Array.from(table.rows).forEach((row) => {
      config.candidates.forEach((candidate) => applyCandidate(doc, row, candidate));
    });
  });
}